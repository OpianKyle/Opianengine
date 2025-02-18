import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestDashboard() {
  // Get current time of day
  const currentDate = new Date();
  const timeOfDay = currentDate.getHours() < 12 ? 'morning' : currentDate.getHours() < 17 ? 'afternoon' : 'evening';

  const mockUser = {
    firstName: "John",
    lastName: "Doe",
    points: 5000
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-muted-foreground">
          Good {timeOfDay}, {`${mockUser.firstName} ${mockUser.lastName}`}
        </h2>
        <h1 className="text-3xl font-bold text-[#1b75bc]">Test Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Message Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a test dashboard page that doesn't require authentication.</p>
            <p className="mt-2">Current points: {mockUser.points}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
