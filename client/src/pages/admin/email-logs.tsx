import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  email_type: string;
  status: string;
  sent_at: string;
  has_attachments: boolean;
  error_message: string | null;
  template_data: any | null;
}

interface EmailLogsResponse {
  logs: EmailLog[];
  totalCount: number;
  page: number;
  limit: number;
}

export default function EmailLogs() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    status: 'all',
    emailType: 'all',
    search: ''
  });

  const { data, isLoading } = useQuery<EmailLogsResponse>({
    queryKey: ['/api/admin/email-logs', filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.emailType !== 'all' && { emailType: filters.emailType }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/admin/email-logs?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch email logs');
      }
      return response.json();
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Logs</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email History</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by email or subject..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.emailType}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, emailType: value }))}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="WELCOME">Welcome</SelectItem>
                    <SelectItem value="POINTS">Points Update</SelectItem>
                    <SelectItem value="REGISTRATION">Registration</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No email logs found
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.sent_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.recipient_email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{log.email_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className={`${log.status === 'SENT' ? 'text-green-500' : 'text-red-500'}`}>
                          {log.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.error_message || (log.has_attachments ? 'Has attachments' : '')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data?.totalCount > filters.limit && (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <span className="px-4 py-2">
                Page {filters.page} of {Math.ceil(data.totalCount / filters.limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page >= Math.ceil(data.totalCount / filters.limit)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}