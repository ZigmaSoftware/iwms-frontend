import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  detectCurrentCoordinates,
  type DetectedCoordinates,
} from "@/utils/geolocation";

export interface AutoDetectLocationButtonProps
  extends Omit<ButtonProps, "onClick" | "children"> {
  /** Called with the detected coordinates once detection succeeds. */
  onDetected: (coordinates: DetectedCoordinates) => void;
  /** Decimal places to round latitude/longitude to. Defaults to 7. */
  decimalPlaces?: number;
  /** Optional label override for the idle state. */
  label?: string;
}

/**
 * Button that detects the user's current coordinates via the browser
 * Geolocation API and reports them through `onDetected`. Shows a loading
 * spinner while detection is in progress and surfaces failures via this
 * app's toast helper. Does not write into any form state itself — wiring
 * the detected coordinates into a specific form is left to the caller.
 */
export function AutoDetectLocationButton({
  onDetected,
  decimalPlaces = 7,
  label = "Detect current location",
  variant = "outline",
  size = "sm",
  type = "button",
  disabled,
  ...buttonProps
}: AutoDetectLocationButtonProps) {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);

  const handleClick = async () => {
    setIsDetecting(true);
    try {
      const coordinates = await detectCurrentCoordinates(decimalPlaces);
      onDetected(coordinates);
    } catch (error) {
      toast({
        title: "Location detection failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to detect your current location.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      disabled={disabled || isDetecting}
      onClick={handleClick}
      {...buttonProps}
    >
      {isDetecting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LocateFixed className="h-4 w-4" />
      )}
      {isDetecting ? "Detecting..." : label}
    </Button>
  );
}

export default AutoDetectLocationButton;
