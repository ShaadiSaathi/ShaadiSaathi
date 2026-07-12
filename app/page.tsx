"use client"

import { useState } from "react"
import Navbar from "@/components/shaadi-saathi/Navbar"
import LandingHero from "@/components/shaadi-saathi/landing/LandingHero"
import VendorBenefits from "@/components/shaadi-saathi/landing/VendorBenefits"
import Problem from "@/components/shaadi-saathi/Problem"
import Features from "@/components/shaadi-saathi/Features"
import HowItWorks from "@/components/shaadi-saathi/HowItWorks"
import Testimonials from "@/components/shaadi-saathi/Testimonials"
import FinalCTA from "@/components/shaadi-saathi/FinalCTA"
import Footer from "@/components/shaadi-saathi/Footer"
import JaaliDivider from "@/components/shaadi-saathi/JaaliDivider"
import type { LandingRole } from "@/components/shaadi-saathi/landing/RoleToggle"

export default function ShaadiSaathiLandingPage() {
  const [role, setRole] = useState<LandingRole>("family")

  return (
    <div className="shaadi-saathi min-h-screen bg-ivory text-maroon-dark">
      <Navbar role={role} onRoleChange={setRole} />
      <main>
        <LandingHero role={role} onRoleChange={setRole} />
        <JaaliDivider />
        {role === "family" && (
          <>
            <Problem />
            <JaaliDivider />
            <Features />
            <JaaliDivider />
            <HowItWorks />
            <JaaliDivider />
            <Testimonials />
            <FinalCTA />
          </>
        )}
        {role === "vendor" && (
          <FinalCTA
            title="Ready to grow your wedding business?"
            description="List your catering, decor, photography, or entertainment services — and start receiving booking requests from real families."
            ctaLabel="List Your Business"
            ctaHref="/vendor/signup"
          />
        )}
        <JaaliDivider />
        <VendorBenefits />
      </main>
      <Footer />
    </div>
  )
}
