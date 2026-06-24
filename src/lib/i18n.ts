import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Loading...": "Loading...",
      "KindBuds Ltd.": "KindBuds Ltd.",
      "Cannabis Cultivation": "Cannabis Cultivation",
      "Seedling": "Seedling",
      "Vegetative": "Vegetative",
      "Flowering": "Flowering",
      "Growing": "Growing",
      "Harvested": "Harvested",
      "Crop Records": "Crop Records",
      "Manage cultivation batches and harvest history": "Manage cultivation batches and harvest history",
      "Active Batches": "Active Batches",
      "Harvested Batches": "Harvested Batches",
      "Total Yield": "Total Yield",
      "Cultivation Batches": "Cultivation Batches",
      "Batch Name": "Batch Name",
      "Strain": "Strain",
      "Zone": "Zone",
      "Planted": "Planted",
      "Status": "Status",
      "Yield": "Yield",
      "No batches found": "No batches found",
      "Get started by creating a new cultivation batch.": "Get started by creating a new cultivation batch."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
