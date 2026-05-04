import { AlertLevel, WaterReading, WATER_THRESHOLDS } from "./alertService";

// Format SMS message for water alert
export const formatAlertSMS = (
  deviceName: string,
  reading: WaterReading,
  level: AlertLevel
): string => {
  const severity = level === AlertLevel.DANGER ? "🚨 DANGER" : "⚠️ WARNING";
  const baseMessage = `${severity} - WATER QUALITY ALERT
Device: ${deviceName}
TDS: ${reading.tds} ppm
pH: ${reading.ph}
Turbidity: ${reading.turbidity} NTU

ACTION: Check water quality immediately!
Stay hydrated, stay safe! 💧`;

  return baseMessage;
};

// Send SMS via Twilio (backend endpoint)
export const sendAlertSMS = async (
  phoneNumber: string,
  deviceName: string,
  reading: WaterReading,
  level: AlertLevel
): Promise<boolean> => {
  try {
    const messageBody = formatAlertSMS(deviceName, reading, level);

    // Call backend service to send SMS (Firebase Cloud Function or custom endpoint)
    const response = await fetch("/api/send-alert-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: messageBody,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS sending failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error sending SMS alert:", error);
    return false;
  }
};

// Simulate SMS sending for demo (when Twilio not configured)
export const sendDemoAlert = async (
  phoneNumber: string,
  deviceName: string,
  reading: WaterReading,
  level: AlertLevel
): Promise<boolean> => {
  const message = formatAlertSMS(deviceName, reading, level);
  console.log(`[DEMO SMS] To: ${phoneNumber}\n${message}`);
  return true;
};
