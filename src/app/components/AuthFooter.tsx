import { Link } from "react-router";

export function AuthFooter() {
    return (
        <div className="flex flex-col items-center justify-center text-center mt-8 mb-4 text-sm text-green-800/90 space-y-6">
            <div className="flex flex-col space-y-1.5">
                <a href="mailto:info@kindbudsltd.com" className="hover:underline hover:text-green-600 transition-colors">
                    info@kindbudsltd.com
                </a>
                <a href="tel:+256789989420" className="hover:underline hover:text-green-600 transition-colors">
                    +256-789-989420
                </a>
                <span>P.O. Box 161599</span>
                <span>Kampala, Uganda</span>
            </div>

            <div className="flex flex-col space-y-1.5 pt-4 text-sm w-full relative">
                <Link to="/privacy-policy" className="hover:underline hover:text-green-600 transition-colors">
                    Privacy Policy
                </Link>
                <Link to="/accessibility" className="hover:underline hover:text-green-600 transition-colors">
                    Accessibility Statement
                </Link>
            </div>

            <p className="text-xs text-gray-400 mt-4">
                © 2026 KindBuds Ltd. All rights reserved.
            </p>
        </div>
    );
}
