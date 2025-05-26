import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactLionel() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    hearAboutUs: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact/lionel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      toast({
        title: "Message Sent Successfully!",
        description: "Lionel will get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: '',
        surname: '',
        email: '',
        hearAboutUs: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: "Failed to Send Message",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Connect with Lionel
          </h1>
          <p className="text-xl text-gray-600">
            Your dedicated sales representative
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Representative Info Card */}
          <Card className="bg-white shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <img 
                  src="/Lionel.jpg" 
                  alt="Lionel - Senior Sales Representative"
                  className="w-32 h-32 rounded-full object-cover object-top border-4 border-blue-200 shadow-lg"
                />
              </div>
              <CardTitle className="text-2xl text-gray-900">Lionel</CardTitle>
              <CardDescription className="text-lg">Senior Sales Representative</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-600">
                <Mail className="w-5 h-5 text-blue-600" />
                <span>lionel@opianrewards.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone className="w-5 h-5 text-blue-600" />
                <span>Available via contact form</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>South Africa</span>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Specializes in:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Insurance Solutions</li>
                  <li>• Rewards Programs</li>
                  <li>• Customer Onboarding</li>
                  <li>• Account Management</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card className="bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">Send a Message</CardTitle>
              <CardDescription>
                Fill out the form below and Lionel will respond within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      placeholder="Your first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Surname *
                    </label>
                    <Input
                      type="text"
                      value={formData.surname}
                      onChange={(e) => handleInputChange('surname', e.target.value)}
                      required
                      placeholder="Your last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Where did you hear about us? *
                  </label>
                  <Select value={formData.hearAboutUs} onValueChange={(value) => handleInputChange('hearAboutUs', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Search</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="referral">Friend/Family Referral</SelectItem>
                      <SelectItem value="agent">Agent Referral</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    required
                    rows={4}
                    placeholder="Tell Lionel how he can help you..."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message to Lionel
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Back to main site */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Opian Rewards
          </a>
        </div>
      </div>
    </div>
  );
}