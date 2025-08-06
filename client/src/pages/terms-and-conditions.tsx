import React from 'react';
import { Helmet } from 'react-helmet';
import { useTheme } from '@/providers/theme-provider';
import { FileText, Shield, Users, Clock, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';

export default function TermsAndConditions() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-[#01162f] dark:to-[#011d3d]">
      <Helmet>
        <title>Terms and Conditions - Opian Rewards</title>
        <meta name="description" content="Terms and Conditions for Opian Rewards insurance services and benefits" />
      </Helmet>
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#011d3d] to-[#022b5c] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <FileText className="h-16 w-16 text-[#43EB3E]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Understanding your rights and obligations when using Opian Rewards insurance services and benefits.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white dark:bg-[#011d3d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#022b5c] overflow-hidden">
          
          {/* Content */}
          <div className="p-8 md:p-12">
            
            {/* Key Icons Section */}
            <div className="grid grid-cols-4 gap-4 mb-12">
              <div className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl">
                <FileText className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Legal Terms</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl">
                <Shield className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Coverage</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl">
                <Users className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Benefits</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl">
                <Clock className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Claims</span>
              </div>
            </div>

            {/* Service Provider Information */}
            <section className="mb-12 p-6 bg-gradient-to-r from-[#011d3d] to-[#022b5c] rounded-xl text-white">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold">Service Provider Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="mb-2"><strong>Service Provider:</strong> Opian Rewards (Pty) Ltd</p>
                  <p className="mb-2"><strong>Juristic Representative of:</strong> Opian Financial Services (Pty) Ltd</p>
                  <p className="mb-2"><strong>Company Reg. No. (Opian Rewards):</strong> 2021/411623/07</p>
                </div>
                <div>
                  <p className="mb-2"><strong>Company Reg. No. (Opian Financial Services):</strong> 2018/584168/07</p>
                  <p className="mb-2"><strong>FSP No.:</strong> 50974</p>
                  <p className="text-[#43EB3E] font-semibold">Authorized Financial Services Provider</p>
                </div>
              </div>
            </section>

            {/* General Definitions */}
            <section className="mb-12 p-6 bg-gradient-to-br from-blue-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-blue-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">General Definitions</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Policyholder</h3>
                  <p className="text-gray-700 dark:text-gray-300">The individual whose name appears on the policy or cover document.</p>
                </div>
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Beneficiary</h3>
                  <p className="text-gray-700 dark:text-gray-300">The person(s) entitled to claim benefits under the cover.</p>
                </div>
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cover</h3>
                  <p className="text-gray-700 dark:text-gray-300">Refers to the insured benefits listed in this agreement.</p>
                </div>
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Waiting Period</h3>
                  <p className="text-gray-700 dark:text-gray-300">A period after the policy start date during which certain benefits may not be claimable.</p>
                </div>
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Accidental Event</h3>
                  <p className="text-gray-700 dark:text-gray-300">An unforeseen, external, violent, and visible event leading to injury or death.</p>
                </div>
              </div>
            </section>

            {/* Covered Products and Benefits */}
            <section className="mb-12 p-6 bg-gradient-to-br from-green-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-green-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-6">
                <Users className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Covered Products and Benefits</h2>
              </div>
              
              <div className="space-y-6">
                {/* Funeral Cover */}
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2.1 Funeral Cover</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    Provides a lump sum upon the death of the policyholder or registered dependents to assist with funeral-related costs.
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border-l-4 border-yellow-400">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Waiting Period:</strong> Applies for natural death; none for accidental death.
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border-l-4 border-red-400 mt-2">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Exclusions:</strong> Death due to suicide within a specific period, criminal acts, or undeclared pre-existing conditions.
                    </p>
                  </div>
                </div>

                {/* Accidental Death Cover */}
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2.2 Accidental Death Cover</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    Offers a benefit in the event of death caused by an accidental event.
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Immediate coverage unless otherwise specified in the policy schedule.
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border-l-4 border-red-400 mt-2">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Exclusions:</strong> Death from intentional self-harm, substance abuse, or illegal activities.
                    </p>
                  </div>
                </div>

                {/* Additional Benefits Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.3 Funeral Assist</h3>
                    <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                      <li>• Funeral planning assistance</li>
                      <li>• Discounted funeral-related services</li>
                      <li>• Grief counselling</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.4 Family Income Benefit</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Monthly income provided to a nominated beneficiary for a specified number of months after the policyholder's death.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.5 EMS Assist</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Access to 24/7 ambulance and emergency medical response for accidents or life-threatening events.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.6 Legal Assist</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Telephonic legal consultation for civil, labour, and criminal legal matters.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.7 Repatriation Cover</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Transport of mortal remains to the town or province of burial.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.8 Celebrate Life</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Wellness benefits, vouchers, discounts, or rewards. Subject to availability.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.9 24/7 Nurse On-Call</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Access to qualified nurses for telephonic health advice and medical triage support.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2.10 Virtual GP Assistant</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Access to online general practitioners via phone or video consultation.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Claims Process */}
            <section className="mb-12 p-6 bg-gradient-to-br from-purple-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-purple-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <Clock className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Claims Process</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Claims must be submitted within a reasonable period after the event.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Required Documents:</h3>
                <ul className="list-disc pl-5 space-y-1 text-blue-800 dark:text-blue-300 text-sm">
                  <li>Valid identification</li>
                  <li>Completed claim form</li>
                  <li>Supporting documentation (e.g., death certificate, police report)</li>
                </ul>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Processing Time:</strong> Up to 14 working days after receipt of all valid documents.
                </p>
              </div>
            </section>

            {/* Exclusions */}
            <section className="mb-12 p-6 bg-gradient-to-br from-red-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-red-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">General Exclusions</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                The following exclusions apply to all benefits:
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-400">
                  <p className="text-red-800 dark:text-red-200 text-sm">• Fraudulent claims or misrepresentation</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-400">
                  <p className="text-red-800 dark:text-red-200 text-sm">• Death or injury related to illegal activities</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-400">
                  <p className="text-red-800 dark:text-red-200 text-sm">• Pre-existing conditions not declared at the time of application</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-400">
                  <p className="text-red-800 dark:text-red-200 text-sm">• Self-inflicted harm or suicide (within applicable waiting period)</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-400">
                  <p className="text-red-800 dark:text-red-200 text-sm">• War, riots, civil unrest, or acts of terrorism</p>
                </div>
              </div>
            </section>

            {/* Contact and Dispute Resolution */}
            <section className="mb-12 p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-indigo-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <Phone className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Dispute Resolution</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Complaints or queries can be directed to:
              </p>
              <div className="bg-gradient-to-r from-[#43EB3E] to-green-400 p-6 rounded-lg text-white mb-4">
                <p className="mb-2"><strong>Email:</strong> info@opianrewards.com</p>
                <p className="mb-2"><strong>Phone:</strong> +27 86 126 3346</p>
                <p><strong>Address:</strong> 260 Uys Krige Dr, Loevenstein, Cape Town, 7530, South Africa</p>
              </div>
              <div className="bg-gray-100 dark:bg-[#011d3d] p-4 rounded-lg border border-gray-200 dark:border-[#022b5c]">
                <p className="text-gray-900 dark:text-white text-sm">
                  <strong>Note:</strong> Unresolved disputes may be referred to the Ombudsman for Long-Term Insurance.
                </p>
              </div>
            </section>

            {/* Legal Information */}
            <section className="p-6 bg-gradient-to-r from-[#011d3d] to-[#022b5c] rounded-xl text-white">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold">Important Legal Information</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-lg">
                  <h3 className="font-semibold mb-2">Cancellation and Lapse</h3>
                  <p className="text-sm">Non-payment of premiums for a specified consecutive period may lead to policy lapse. The policyholder may cancel the policy by providing written notice with at least 30 days' notice.</p>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <h3 className="font-semibold mb-2">Amendments</h3>
                  <p className="text-sm">Opian Rewards (Pty) Ltd reserves the right to amend these Terms and Conditions from time to time. Notice will be provided through official communication channels or policy documents.</p>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <h3 className="font-semibold mb-2">Governing Law</h3>
                  <p className="text-sm">These Terms and Conditions are governed by the laws of the Republic of South Africa.</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
        
      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-[#01162f] text-gray-600 dark:text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-center w-full mb-8">
            <img 
              src={theme === 'dark' ? '/opian-logo-white.png' : '/opian-rewards-logo(R).png'}
              alt="OPIAN Rewards" 
              className="h-10 w-auto"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                img.src = '/logo-fallback.png';
              }}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-center lg:text-left">
            {/* Left column - Contact Information */}
            <div className="md:col-span-2 lg:col-span-1 flex flex-col items-center lg:items-start">
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <p className="flex items-center mb-2">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <a href="tel:+27861263346" className="hover:text-[#43EB3E] transition-colors">+27 86 126 3346</a>
              </p>
              <p className="flex items-center mb-2">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <a href="mailto:info@opianrewards.com" className="hover:text-[#43EB3E] transition-colors">info@opianrewards.com</a>
              </p>
              <p className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
                <span>260 Uys Krige Dr, Loevenstein, Cape Town, 7530, South Africa</span>
              </p>
            </div>
            
            {/* Middle columns - Package/Resources/Legal */}
            <div className="lg:col-span-2 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center lg:items-center">
                <h3 className="text-lg font-semibold mb-4">Packages</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Opportunity</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Momentum</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prosper</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prestige</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Pinnacle</a></li>
                </ul>
              </div>
              <div className="flex flex-col items-center lg:items-center">
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">FAQs</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Contact</a></li>
                </ul>
              </div>
              <div className="flex flex-col items-center lg:items-center">
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="/terms-and-conditions" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Terms of Service</a></li>
                  <li><a href="/privacy-policy" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
            
            {/* Right column - Legal Information */}
            <div className="md:col-span-2 lg:col-span-1 flex flex-col items-center lg:items-start">
              <h3 className="font-semibold mb-4">Legal Information</h3>
              <div className="text-center lg:text-left w-full max-w-xs">
                <p className="mb-2 text-sm">Opian Rewards (Pty) Ltd is a Juristic Representative of Opian Financial Services (Pty) Ltd</p>
                <p className="mb-2 text-sm">Company Registration Number: 2021/411623/07</p>
                <p className="mb-2 text-sm">Opian Financial Services (Pty) Ltd is an Authorised Financial Services Provider</p>
                <p className="mb-2 text-sm">Company Registration Number: 2018/584168/07</p>
                <p className="text-sm">FSP No: 50974</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6 text-center text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}