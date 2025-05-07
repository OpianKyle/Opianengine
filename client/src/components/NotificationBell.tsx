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

interface NotificationBellProps {
  className?: string;
  iconSize?: number;
}

const NotificationBell = ({ className, iconSize = 6 }: NotificationBellProps = {}) => {
  const { user } = useUser();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  // Default to connected since isConnected may not be present in all versions
  const isConnected = true;

  // Only render if user is authenticated
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`relative h-12 w-12 rounded-full ${!isConnected ? 'opacity-50' : ''} ${className || ''}`}
          title={isConnected ? 'Notifications' : 'Connecting to notification service...'}
        >
          <Bell style={{ height: `${iconSize}px`, width: `${iconSize}px` }} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] text-white">
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
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">
                    {notification.type === "POINTS_ALLOCATION" || notification.type === "POINTS_AWARDED" ? (
                      <span className={
                        notification.hasOwnProperty('points') && 
                        typeof (notification as any).points === 'number' && 
                        (notification as any).points >= 0 
                          ? "text-green-600" 
                          : "text-red-600"
                      }>
                        {(notification as any).formattedPoints || (notification as any).points || ""} points
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
                      e.preventDefault();
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    aria-label="Clear notification"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {(notification as any).description || notification.message || "New notification"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date((notification as any).timestamp || notification.createdAt || new Date()), "MMM d, h:mm a")}
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