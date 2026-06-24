import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import {
  Sprout,
  TrendingUp,
  Bell,
  Shield,
  Smartphone,
  BarChart3,
  Cloud,
  Zap,
} from "lucide-react";

export function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: TrendingUp,
      title: "Real-Time Monitoring",
      description: "Track substrate volumetric water content, canopy temperature, humidity, and PAR levels in real-time.",
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Receive intelligent notifications for nutrient schedules, VPD deviations, heat stress, and pest risks.",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Visualize your cultivation metrics with comprehensive charts and grow cycle insights.",
    },
    {
      icon: Cloud,
      title: "Light Cycle Integration",
      description: "Automate and track photoperiod schedules (18/6 vegetative, 12/12 flowering) with smart sensors.",
    },
    {
      icon: Zap,
      title: "AI Recommendations",
      description: "Leverage AI-powered suggestions for Vapor Pressure Deficit (VPD) optimization and crop steering.",
    },
    {
      icon: Shield,
      title: "Data Security",
      description: "Your grow recipes, crop logs, and yield history are encrypted and securely stored.",
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">KindBuds Ltd.</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/app")}>View Dashboard</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50 flex-1 flex items-center" style={{minHeight: 'calc(100vh - 73px)'}}>
        <div className="container mx-auto px-4 py-16 md:py-24 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Now Available on Mobile & Desktop</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Cultivating Trust.<br />Delivering Global Standards.
              </h1>
              <p className="text-xl md:text-2xl text-gray-600">
                Developing a premium medical cannabis cultivation platform in Uganda for the future of global supply.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-lg px-8" onClick={() => navigate("/app")}>
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Contact Us
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col gap-4">
                <ImageWithFallback
                  src="/Cannabis-Growing-Greenhouse-1536x1024_edited.png"
                  alt="Cannabis Growing Greenhouse"
                  className="w-full h-64 md:h-80 object-cover"
                />
                <ImageWithFallback
                  src="/Cannabis-Plants-in-Greenhouse.avif"
                  alt="Cannabis Plants in Greenhouse"
                  className="w-full h-64 md:h-80 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">About Us</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Cultivating Trust. Delivering Global Standards.<br /><br />
            We are dedicated to developing a premium medical cannabis cultivation platform in Uganda, paving the way for the future of global supply. Our mission is to integrate cutting-edge technology with rigorous quality control to set new benchmarks in the industry. By combining real-time environmental monitoring with AI-driven insights, we empower cultivators to achieve maximum yield and superior cannabinoid concentrations, all while maintaining the highest level of security and sustainability.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools modern cultivators need to optimize
              their crops.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-primary transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
              <div className="text-green-100">Commercial Cultivators</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">42%</div>
              <div className="text-green-100">Average Terpene & THC Increase</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">24/7</div>
              <div className="text-green-100">Climate Monitoring & Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Optimize Your Cultivation?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join professional growers who are already using KindBuds Ltd. to increase
            cannabinoid density and grow room efficiency.
          </p>
          <Button size="lg" className="text-lg px-8" onClick={() => navigate("/app")}>
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                  <Sprout className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">KindBuds Ltd.</span>
              </div>
              <p className="text-sm">AI-Powered Cannabis Cultivation for the Modern Grower</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#about" className="hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:info@kindbuds.com" className="hover:text-white">
                    info@kindbuds.com
                  </a>
                </li>
                <li>
                  <span className="text-gray-400">
                    +256 123 456 789
                  </span>
                </li>
                <li>
                  <span className="text-gray-400">
                    Kampala, Uganda
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            © 2026 KindBuds Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
