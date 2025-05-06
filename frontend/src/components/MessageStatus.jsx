import { Check, CheckCheck, Clock, AlertCircle, Wifi } from 'lucide-react';

/**
 * Message Status Component
 * Displays the status of a message (sent, delivered, read, queued, error)
 */
const MessageStatus = ({ status, isLanMessage = false }) => {
  // Default to 'sent' if no status provided
  const messageStatus = status || 'sent';
  
  // Determine icon and color based on status
  let Icon = Check;
  let color = 'text-gray-400';
  let tooltip = 'Sent';
  
  switch (messageStatus) {
    case 'queued':
      Icon = Clock;
      color = 'text-yellow-500';
      tooltip = 'Queued - Will send when online';
      break;
    case 'sending':
      Icon = Clock;
      color = 'text-blue-500 animate-pulse';
      tooltip = 'Sending...';
      break;
    case 'sent':
      Icon = Check;
      color = 'text-gray-400';
      tooltip = 'Sent';
      break;
    case 'delivered':
      Icon = CheckCheck;
      color = 'text-gray-400';
      tooltip = 'Delivered';
      break;
    case 'read':
      Icon = CheckCheck;
      color = 'text-blue-500';
      tooltip = 'Read';
      break;
    case 'error':
      Icon = AlertCircle;
      color = 'text-red-500';
      tooltip = 'Failed to send';
      break;
    case 'sent-lan':
      Icon = Wifi;
      color = 'text-green-500';
      tooltip = 'Sent over LAN';
      break;
    default:
      Icon = Check;
      color = 'text-gray-400';
      tooltip = 'Sent';
  }
  
  // Add LAN indicator if it's a LAN message
  if (isLanMessage && messageStatus !== 'sent-lan') {
    return (
      <div className="flex items-center gap-0.5" title={tooltip}>
        <Icon className={`${color} w-3 h-3`} />
        <Wifi className="text-green-500 w-3 h-3" />
      </div>
    );
  }
  
  return (
    <div title={tooltip}>
      <Icon className={`${color} w-3 h-3`} />
    </div>
  );
};

export default MessageStatus;
