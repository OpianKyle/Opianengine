import { Helmet } from "react-helmet";

interface AdminSEOProps {
  title: string;
  description?: string;
}

export function AdminSEO({ 
  title, 
  description = "Opian Rewards admin dashboard - Manage users, packages, referrals and analytics" 
}: AdminSEOProps) {
  // Construct a full title with "Admin | " prefix
  const fullTitle = `Admin | ${title} - Opian Rewards`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="noindex, nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Helmet>
  );
}