event notifications and links  should be sent via the users phone Number

## Event Notification via Phone Number

### Overview
Event notifications must be delivered to users via their registered phone numbers. This ensures timely communication and increases the likelihood that users receive important updates about upcoming events.

### Requirements
1. **Notification Trigger:**
	- Notifications should be sent when a new event is created, updated, or cancelled.
	- Reminders should be sent before the event (e.g., 24 hours and 1 hour prior).

2. **Delivery Method:**
	- Use SMS as the primary channel for sending notifications and event links.
	- If available, support WhatsApp or other messaging platforms as secondary channels.

3. **Message Content:**
	- Include event name, date, time, location, and a direct link to event details or RSVP.
	- Personalize messages with the user's name when possible.

4. **User Preferences:**
	- Allow users to opt in/out of event notifications via their profile settings.
	- Respect user notification preferences and do not send messages to opted-out users.

5. **Error Handling:**
	- Log failed delivery attempts and retry up to 3 times with exponential backoff.
	- Notify admins if repeated failures occur for a user.

6. **Integration:**
	- Integrate with existing user database to fetch phone numbers.
	- Use a reliable SMS gateway (e.g., Twilio, Nexmo) for message delivery.

7. **Security & Privacy:**
	- Do not expose phone numbers in logs or error messages.
	- Ensure compliance with data protection regulations (e.g., GDPR, CCPA).

### Workflow
1. Event is created/updated/cancelled in the system.
2. System fetches the list of affected users and their phone numbers.
3. For each user:
	- Check notification preferences.
	- Compose personalized message with event details and link.
	- Send SMS (and/or WhatsApp message).
	- Log delivery status.
4. If delivery fails, retry as per error handling policy.
5. Admins are notified of persistent delivery issues.

### Additional Considerations
- Support localization for message content (multi-language support).
- Track notification delivery and open rates for analytics.
- Provide a way for users to update their phone numbers securely.


