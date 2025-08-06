import React from 'react';
import { Helmet } from 'react-helmet';
import { useTheme } from '@/providers/theme-provider';
import { Shield, Lock, Users, FileText, Phone, Mail, MapPin } from 'lucide-react';

export default function PrivacyPolicy() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-[#01162f] dark:to-[#011d3d]">
      <Helmet>
        <title>Privacy Policy - Opian Rewards</title>
        <meta name="description" content="Privacy Policy and POPI compliance information for Opian Rewards" />
      </Helmet>
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#011d3d] to-[#022b5c] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-[#43EB3E]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Your privacy matters to us. Learn how we collect, use, and protect your personal information 
            in compliance with South African privacy laws.
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
                <Shield className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Secure</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl">
                <Lock className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Protected</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl">
                <Users className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">POPI Compliant</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl">
                <FileText className="h-8 w-8 text-[#43EB3E] mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Transparent</span>
              </div>
            </div>

            {/* Personal Information Section */}
            <section className="mb-12 p-6 bg-gradient-to-br from-blue-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-blue-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Personal Information</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Personal information is collected only when an individual knowingly and voluntarily submits information. 
                Personal Information may be required to provide an individual with further services or to answer any 
                requests or enquiries relating to this service.
              </p>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                It is Opian Rewards (Pty) Ltd's intention that this policy will protect an individual's personal 
                information from being prejudiced in any way and this policy is consistent with the privacy laws 
                applicable in South Africa.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Opian Rewards (Pty) Ltd collects, stores and uses the personal information provided by an individual, 
                in order to provide an estimated insurance quotation.
              </p>
            </section>

            {/* Use of Information Section */}
            <section className="mb-12 p-6 bg-gradient-to-br from-green-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-green-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Use of Information</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">Opian Rewards (Pty) Ltd needs to collect personal or other information:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700 dark:text-gray-300">
                <li>For underwriting purposes</li>
                <li>Assessing and processing claims</li>
                <li>Conducting credit reference searches or verification</li>
                <li>Confirming and verifying an individual's identity</li>
                <li>For credit assessment and credit management</li>
                <li>For purposes of claims history</li>
                <li>For the detection and prevention of fraud, crime, money laundering or other malpractice</li>
                <li>Conducting market or customer satisfaction research</li>
                <li>For audit and record keeping purposes</li>
                <li>In connection with legal proceedings</li>
                <li>Follow an individual's instructions</li>
                <li>Inform an individual of services</li>
                <li>Make sure Opian Rewards' business suits the individual's needs</li>
              </ul>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Personal information that an individual submits is used only for the purpose for which it was intended. 
                Copies of correspondence that may contain personal information are stored in archives for record-keeping 
                and back-up purposes only.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Opian Rewards will not, without an individual's consent, share information with any other third parties, 
                for any purposes whatsoever.
              </p>
            </section>

            {/* Security Section */}
            <section className="mb-12 p-6 bg-gradient-to-br from-yellow-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-yellow-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <Lock className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Security</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Opian Rewards strives to ensure the security, integrity and privacy of personal information submitted. 
                Opian Rewards will review and update its security measures in accordance with future legislation and 
                technological advances. Unfortunately, no data transmission over the Internet can be guaranteed to be 
                totally secure, however, Opian Rewards will endeavour to take all reasonable steps to protect the 
                personal information which an individual submits to Opian Rewards' online product.
              </p>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Opian Rewards may engage with other organisations to provide support services to the FSP. Third parties 
                are obliged to respect the confidentiality of any personal information held by Opian Rewards. A Service 
                Level Agreement is in place with all third parties to ensure adherence to all Privacy Policies.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Opian Rewards' employees are obliged to respect the confidentiality of any personal information held by 
                the FSP. All employees are required to sign an employment contract which includes a confidentiality clause.
              </p>
            </section>

            {/* POPI Act Section */}
            <section className="mb-12 p-6 bg-gradient-to-br from-purple-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-purple-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">POPI Act Compliance</h2>
              </div>
              <p className="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                According to the POPI Act, there are eight conditions that must be complied with to ensure that the 
                processing of personal information is lawful:
              </p>
              
              <div className="space-y-6">
                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">1. Accountability</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    The responsible party must ensure that the conditions set out in Chapter 3 of the POPIA and all 
                    the measures that give effect to such conditions are complied with at the time of determining 
                    the purpose and the means of the processing.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2. Processing Limitation</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Personal information may only be processed in a lawful and reasonable manner that does not 
                    infringe on the privacy of the data subject.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">3. Purpose Specific</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Opian Rewards will process personal information only for specific, explicitly defined, and 
                    legitimate reasons. Opian Rewards will inform data subjects of these reasons prior to collecting 
                    or recording the data subject's personal information.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">4. Further Processing Limitation</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Personal information will not be processed for a secondary purpose unless that processing is 
                    compatible with the original purpose.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">5. Information Quality</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Opian Rewards will take reasonable steps to ensure that all personal information collected is 
                    complete, accurate and not misleading.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">6. Openness</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Opian Rewards will take reasonable steps to inform all data subjects whose information is being 
                    collected of the relevant details regarding data collection and processing.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">7. Security Safeguards</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    The responsible party must secure the integrity and confidentiality of personal information in 
                    its possession or under its control by taking appropriate, reasonable technical and organisational 
                    measures.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-[#011d3d] rounded-lg border border-gray-200 dark:border-[#022b5c]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">8. Data Subject Participation</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    A data subject may request whether their personal information is held, as well as the correction 
                    or deletion of his or her personal information held by Opian Rewards.
                  </p>
                </div>
              </div>
            </section>

            {/* Contact Information Section */}
            <section className="mb-12 p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-indigo-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <Phone className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Contact Information</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Any questions relating to Opian Rewards' POPI policy or the treatment of an individual's personal 
                data may be addressed to the contact details below:
              </p>
              <div className="bg-gradient-to-r from-[#43EB3E] to-green-400 p-6 rounded-lg text-white">
                <p className="mb-2"><strong>Information Officer:</strong> Mic-Shane Brown</p>
                <p className="mb-2"><strong>Telephone:</strong> +27 86 126 3346</p>
                <p className="mb-2"><strong>Postal Address:</strong> 260 Uys Krige Dr, Loevenstein, Cape Town, 7530, South Africa</p>
                <p><strong>Email:</strong> info@opianrewards.com</p>
              </div>
            </section>

            {/* Complaints Section */}
            <section className="mb-12 p-6 bg-gradient-to-br from-red-50 to-white dark:from-[#022b5c] dark:to-[#011d3d] rounded-xl border border-red-100 dark:border-[#022b5c]">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">POPI Complaints</h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Data subjects have the right to complain in instances where any of their rights under POPIA have been 
                infringed upon. All complaints must be submitted to Opian Rewards in writing and will be considered 
                by the Information Officer.
              </p>
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                Where the data subject is not satisfied with the Information Officer's determination, the data subject 
                has the right to complain to the Information Regulator.
              </p>
              <div className="bg-gray-100 dark:bg-[#011d3d] p-4 rounded-lg border border-gray-200 dark:border-[#022b5c]">
                <p className="mb-2 text-gray-900 dark:text-white"><strong>Information Regulator</strong></p>
                <p className="mb-1 text-gray-700 dark:text-gray-300"><strong>Tel:</strong> 012 406 4818 or +27 (0) 10 023 5207</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Email:</strong> inforeg@justice.gov.za</p>
              </div>
            </section>

            {/* Legal Information Section */}
            <section className="p-6 bg-gradient-to-r from-[#011d3d] to-[#022b5c] rounded-xl text-white">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-[#43EB3E] mr-3" />
                <h2 className="text-2xl font-semibold">Legal Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="mb-2"><strong>Opian Rewards (Pty) Ltd</strong> is a Juristic Representative of Opian Financial Services (Pty) Ltd</p>
                  <p className="mb-2"><strong>Company Registration Number:</strong> 2021/411623/07</p>
                </div>
                <div>
                  <p className="mb-2"><strong>Opian Financial Services (Pty) Ltd</strong> is an Authorised Financial Services Provider</p>
                  <p className="mb-2"><strong>Company Registration Number:</strong> 2018/584168/07</p>
                  <p><strong>FSP No:</strong> 50974</p>
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
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Terms of Service</a></li>
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