import { db } from '../firebase';

interface KnowledgeDocument {
    id: string;
    title: string;
    source: string;
    tags: string[];
    content: string;
}

const BUILTIN_KNOWLEDGE_BASE: KnowledgeDocument[] = [
    {
        id: 'kb_planting_transplanting',
        title: 'Planting (Seeds & Clones) and Transplanting',
        source: 'kindbuds_cultivation_guide.md',
        tags: ['planting', 'seeds', 'clones', 'cloning', 'transplanting', 'germination', 'propagation', 'variety', 'field'],
        content: `### Planting Stage (1. Seeds & 2. Clones) and Transplanting
- **1. Seeds**: Germinate cannabis seeds at 22–25°C with 70–80% relative humidity. Track Date, Variety, No. of Seeds, and Planted quantity.
- **2. Clones**: Take cuttings from healthy mother plants, root in propagation domes at 75–85% RH and 23–25°C for 10–14 days. Track Date, Variety, No. of Clones, and Planted quantity.
- **Transplanting**: Once seedlings or clones establish strong white root systems, transplant into destination fields or grow rooms. Always record Date, Variety, No. of Plants, and Field.`
    },
    {
        id: 'kb_vegetative_topping_pruning',
        title: 'Vegetative Stage: Topping, Pruning & Discarded Plants',
        source: 'kindbuds_cultivation_guide.md',
        tags: ['vegetative', 'topping', 'pruning', 'discarded', 'canopy', 'vpd', 'humidity', 'temperature', 'reason'],
        content: `### Vegetative Growth Management
- **Environment**: Maintain 22–28°C canopy temperature, 55–70% RH, and VPD between 0.8–1.2 kPa under an 18/6 light cycle.
- **Topping & Pruning**: Record Topping Date (pinching the main apical meristem to promote bushier multi-cola canopy) and Pruning Date (lollipopping/defoliating lower shaded nodes to improve airflow and light penetration).
- **Discarded Plants**: Cull weak, male, hermaphrodite, or diseased plants immediately. Under Discarded records, always log Date, Variety, Field, and Reason.`
    },
    {
        id: 'kb_pre_post_harvest',
        title: 'Pre-Harvest, Post-Harvest Drying, Trimming & Storage',
        source: 'kindbuds_cultivation_guide.md',
        tags: ['pre_harvest', 'post_harvest', 'harvest', 'drying', 'curing', 'trimming', 'fresh weight', 'dry weight', 'storage', 'packaging', 'moisture'],
        content: `### Pre-Harvest, Post-Harvest & Storage Lifecycle
- **Pre_Harvest**: Inspect trichome maturity (cloudy/amber ratio) before cutting. Record Date, Batch, Strain, Fresh Weight (kg), and Field.
- **Post_Harvest (Drying & Trimming)**: Hang or rack-dry in controlled drying rooms at 18–21°C and 50–60% RH for 7–14 days until target moisture (~11–12%) is reached. Record Date, Batch, Strain, Dry Weight Before Trimming, and Dry Weight After Trimming.
- **Storage & Packaging**: Cure and package dried flowers in airtight containers at 58–62% RH in cool, dark storage. Record Date, Variety, and Quantity.`
    },
    {
        id: 'kb_nutrients_irrigation',
        title: 'Fertigation, Substrate Moisture & Nutrients',
        source: 'fertilizers_and_nutrients.md',
        tags: ['nutrients', 'nitrogen', 'phosphorus', 'potassium', 'moisture', 'irrigation', 'vwc', 'ec', 'ph', 'soil'],
        content: `### Nutrients & Smart Irrigation
- **Macronutrients**: Higher Nitrogen (N) during Vegetative stage; higher Phosphorus (P) and Potassium (K) during Flowering.
- **pH & Substrate Moisture**: Keep soil pH between 6.0–6.8 (hydro/coco 5.5–6.2) and Volumetric Water Content (VWC) between 35–55% with proper dry-back cycles to prevent root rot.`
    },
    {
        id: 'kb_ipm_pests_diseases',
        title: 'Integrated Pest & Disease Management (IPM)',
        source: 'pest_and_disease_management.md',
        tags: ['pest', 'disease', 'mold', 'botrytis', 'bud rot', 'spider mites', 'aphids', 'powdery mildew', 'ipm'],
        content: `### Pest and Disease Prevention (IPM)
- **Botrytis (Bud Rot) & Powdery Mildew**: Caused by high humidity (>65% RH) and stagnant air in dense canopies. Maintain strong oscillation fan airflow and dehumidification.
- **Pests (Spider Mites, Aphids, Thrips)**: Use biological controls (beneficial predatory mites, ladybugs), strict quarantine of incoming clones, and sanitation between batches.`
    }
];

export class RagService {
    private static instance: RagService;

    private constructor() { }

    public static getInstance(): RagService {
        if (!RagService.instance) {
            RagService.instance = new RagService();
        }
        return RagService.instance;
    }

    /**
     * Queries Firebase Firestore (`KnowledgeBase` collection) and built-in cultivation docs.
     * Works 100% serverless on Firebase Cloud Functions without requiring external vector servers.
     */
    public async queryContext(queryText: string): Promise<string> {
        try {
            const qLower = queryText.toLowerCase();
            const terms = qLower.split(/\W+/).filter(w => w.length > 2);

            let docs: KnowledgeDocument[] = [...BUILTIN_KNOWLEDGE_BASE];

            try {
                const snap = await db.collection('KnowledgeBase').limit(50).get();
                if (!snap.empty) {
                    snap.docs.forEach(d => {
                        const data = d.data();
                        if (data.content) {
                            docs.push({
                                id: d.id,
                                title: data.title || d.id,
                                source: data.source || 'Firestore KnowledgeBase',
                                tags: Array.isArray(data.tags) ? data.tags : [],
                                content: data.content,
                            });
                        }
                    });
                }
            } catch (_firestoreErr) {
                // Fallback to built-in knowledge base if collection is empty or unreachable
            }

            const scored = docs.map(doc => {
                const haystack = `${doc.title} ${doc.tags.join(' ')} ${doc.content}`.toLowerCase();
                let score = 0;
                for (const term of terms) {
                    if (haystack.includes(term)) score += 2;
                    if (doc.tags.some(t => t.toLowerCase().includes(term))) score += 3;
                }
                return { doc, score };
            });

            scored.sort((a, b) => b.score - a.score);
            const topDocs = scored.slice(0, 3).map(s => s.doc);

            return topDocs
                .map(d => `Source: ${d.source} (${d.title})\n---\n${d.content}\n---`)
                .join('\n\n');
        } catch (e: any) {
            console.error('Firebase RAG Error:', e);
            return `Failed to query knowledge base: ${e.message}`;
        }
    }
}

export const ragService = RagService.getInstance();
