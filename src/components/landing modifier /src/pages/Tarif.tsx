import { Header } from "@/components/Header";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";

const Tarif = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default Tarif;
