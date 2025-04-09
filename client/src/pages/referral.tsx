import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Phone, MessageSquare } from 'lucide-react';

export default function ReferralPage() {
  const { code } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [agentName, setAgentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    notes: '',
    referralCode: code
  });
  
  // Validate the referral code when the component loads
  useEffect(() => {
    async function validateReferralCode() {
      try {
        const cleanCode = code?.replace(/-/g, '') || '';
        const response = await fetch(`/api/referral/validate?code=${cleanCode}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setAgentName(data.agentName);
          setIsLoading(false);
        } else {
          toast({
            title: 'Invalid Referral Code',
            description: 'The referral code is invalid or expired.',
            variant: 'destructive'
          });
          // Redirect to home after a delay
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        console.error('Error validating referral code:', error);
        toast({
          title: 'Error',
          description: 'Failed to validate referral code. Please try again later.',
          variant: 'destructive'
        });
        // Redirect to home after a delay
        setTimeout(() => navigate('/'), 3000);
      }
    }
    
    validateReferralCode();
  }, [code, navigate, toast]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/referral/public/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: 'Thanks for your interest!',
          description: `Your details have been sent to ${agentName}, who will contact you shortly to discuss our services and complete your registration.`,
          variant: 'default'
        });
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          notes: '',
          referralCode: code
        });
        
        // Redirect to home after a delay
        setTimeout(() => navigate('/'), 5000);
      } else {
        toast({
          title: 'Submission Failed',
          description: data.error || 'Failed to submit your information. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error submitting referral:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Validating Referral Code</CardTitle>
            <CardDescription className="text-center">Please wait while we validate your referral code...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
          <CardTitle className="text-xl md:text-2xl">You've been referred by {agentName}</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Share your contact details to learn more about OPIAN Rewards
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-md mb-4 text-sm">
              <p className="mb-2 font-medium">How it works:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Enter your contact information below</li>
                <li>{agentName} will contact you to discuss our services</li>
                <li>Complete your full registration with {agentName}'s assistance</li>
                <li>Start enjoying the benefits of OPIAN Rewards!</li>
              </ol>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john.doe@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone Number
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                placeholder="071 234 5678"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Let us know if you have any specific questions or requirements"
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : 'Submit Information'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              By submitting this form, you agree to be contacted by {agentName} regarding OPIAN Rewards products and services.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}