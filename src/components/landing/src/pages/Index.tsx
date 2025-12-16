import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ProductShowcase } from "@/components/ProductShowcase";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <ProductShowcase />
        <FeaturesGrid />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
