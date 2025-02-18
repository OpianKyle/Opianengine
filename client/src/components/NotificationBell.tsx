import { Bell, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { ScrollArea } from "./ui/scroll-area";
import { format } from "date-fns";
import { useUser } from "@/hooks/use-user";

const NotificationBell = () => {
  const { user } = useUser();
  const { notifications, unreadCount, markAsRead, isConnected } = useNotifications();

  // Only render if user is authenticated
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`relative h-8 w-8 rounded-full ${!isConnected ? 'opacity-50' : ''}`}
          title={isConnected ? 'Notifications' : 'Connecting to notification service...'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h2 className="font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => markAsRead()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {!isConnected && (
            <div className="p-4 text-center text-muted-foreground">
              Connecting to notification service...
            </div>
          )}
          {isConnected && notifications.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          )}
          {isConnected && notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`px-4 py-2 cursor-default ${
                !notification.read ? "bg-muted/50" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="font-medium">
                    {notification.type === "POINTS_ALLOCATION" || notification.type === "POINTS_AWARDED" ? (
                      <span className={notification.points && notification.points >= 0 ? "text-green-600" : "text-red-600"}>
                        {notification.formattedPoints} points
                      </span>
                    ) : (
                      "New Notification"
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -my-1 -mr-2 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(notification.timestamp), "MMM d, h:mm a")}
                </p>
              </div>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;