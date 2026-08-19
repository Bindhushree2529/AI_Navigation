import { HeroSection } from "@/components/navigation/HeroSection";
import { FeaturesSection } from "@/components/navigation/FeaturesSection";
import { HowItWorksSection } from "@/components/navigation/HowItWorksSection";
import { SafetyNotice } from "@/components/navigation/SafetyNotice";
import { CTASection } from "@/components/navigation/CTASection";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SafetyNotice />
      <CTASection />
      <Footer />
    </>
  );
}
