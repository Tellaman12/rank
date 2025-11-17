# RankGo Taxi Booking System - Enhanced Edition

A complete vanilla JavaScript taxi booking application with real-time updates, messaging, driver approval workflow, cancellation fees, and email notifications.

## 🚀 New Features

### 1. **Messaging System**
- Real-time chat between drivers and passengers
- Message notifications with unread counts
- Conversation history with timestamps
- Instant communication for ride coordination

### 2. **Real-Time Status Updates**
- Driver status notifications:
  - 🚕 "On the way"
  - ⏰ "Arriving in 2 minutes"
  - 📍 "Arrived at pickup"
  - 🚗 "Trip in progress"
  - ✅ "Trip completed"
- Live status banner for passengers
- Automatic UI refresh every 3 seconds

### 3. **Driver Accept/Decline Workflow**
- Passengers send ride requests (not instant booking)
- Drivers review and accept/decline requests
- Notifications sent for all status changes
- Pending request alerts for drivers

### 4. **Pickup Location Selection**
- **Taxi Rank**: Standard pickup at taxi rank
- **Hiking Spot**: Custom pickup location
  - Specify exact address/landmark
  - Driver sees pickup details

### 5. **Cancellation with Fees**
- 10% cancellation fee on all bookings
- Clear fee disclosure before cancellation
- Fee charged upon confirmation
- Driver notification of cancellation

### 6. **Email Notifications**
- Booking confirmation emails
- Ride acceptance/decline notifications
- Cancellation confirmations
- Payment receipts
- Emails logged to console (mock system)

### 7. **Route Suggestions**
- Autocomplete for origin/destination
- Pre-populated South African locations
- Auto-adds new routes from drivers
- Type-ahead suggestions as you type

### 8. **Enhanced Notifications**
- Bell icon with unread count
- Notification panel with history
- Mark as read functionality
- Clear all option
- Time-relative timestamps

## 📁 Project Structure

```
rankgo-taxi/
├── index.html          # Login page
├── signup.html         # Registration with email preferences
├── passenger.html      # Passenger dashboard with messaging
├── driver.html         # Driver dashboard with accept/decline
├── pay.html            # Payment with email receipts
├── styles.css          # Complete responsive styling
├── app.js              # All JavaScript modules (~2000 lines)
├── assets/
│   └── logo.svg        # Brand logo
└── README.md           # This documentation
```

## 🏃 How to Run

1. **Simple Method**: Open `index.html` in any modern browser

2. **Local Server** (recommended for full functionality):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
   Visit `http://localhost:8000`

## 📋 Complete Workflow

### For Passengers

1. **Sign Up**
   - Create account with email and phone
   - Choose "Passenger" role
   - Enable email notifications

2. **Search for Rides**
   - Use autocomplete for routes
   - View available taxis and times
   - See real-time seat availability

3. **Book a Ride**
   - Select departure time
   - Choose seat count
   - Select pickup type:
     - Taxi Rank (standard)
     - Hiking Spot (specify location)
   - Submit ride request

4. **Wait for Approval**
   - Driver reviews request
   - Receive notification when accepted/declined
   - Message driver if needed

5. **Complete Payment**
   - Pay only after driver accepts
   - Choose payment method
   - Receive email receipt
   - Download receipt

6. **Track Ride**
   - Real-time status updates
   - Live banner notifications
   - Message driver for coordination
   - Know when driver arrives

7. **Cancellation** (if needed)
   - View cancellation fee (10%)
   - Confirm cancellation
   - Fee processed automatically
   - Driver notified

### For Drivers

1. **Sign Up**
   - Create account as "Driver"
   - Enable notifications

2. **Add Vehicles**
   - Vehicle name
   - Route (origin → destination)
   - Seat capacity
   - Price per seat
   - Departure times

3. **Manage Requests**
   - View pending ride requests
   - See passenger details
   - Check pickup location
   - Accept or decline
   - Message passengers

4. **Update Ride Status**
   - Mark as "On the way"
   - Notify "2 minutes away"
   - Confirm arrival
   - Start trip
   - Complete trip

5. **Track Earnings**
   - Today's earnings
   - Weekly summary
   - Total revenue
   - View booking history

## 💳 Payment Gateway (Mock)

### Supported Methods
- **Credit/Debit Card**: Full validation
- **EFT Transfer**: Bank details provided
- **Mobile Wallet**: Phone number entry

### Test Card Details
```
Card Number: 4111 1111 1111 1111
Expiry: 12/25 (any future date)
CVV: 123 (any 3-4 digits)
Name: Any name
```

### Features
- 95% success rate simulation
- Real payment processing feel
- Transaction IDs generated
- Receipts with full details

## 📧 Email System (Mock)

Emails are simulated and logged to browser console:
- **Booking Confirmation**: Full booking details
- **Ride Accepted**: Payment reminder
- **Ride Declined**: Rebooking suggestion
- **Cancellation**: Fee confirmation

To view emails:
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for "📧 Email Sent:" entries

## 🔄 Real-Time Updates

The system polls every 3 seconds for:
- New notifications
- Ride status changes
- Message updates
- Pending request counts

Updates are automatic - no page refresh needed!

## 💾 Data Storage

Uses browser's LocalStorage:
- `users`: User accounts
- `vehicles`: Driver vehicles
- `bookings`: All bookings with statuses
- `messages`: Chat conversations
- `notifications`: User notifications
- `transactions`: Payment records
- `routes`: Autocomplete suggestions
- `sentEmails`: Email history

**Note**: Clear localStorage to reset all data.

## 🔒 Security Considerations

This is a **demo application**. For production:

- Hash passwords server-side
- Implement proper authentication (JWT, sessions)
- Use real payment gateway (Stripe, PayFast, etc.)
- Add CSRF protection
- Implement rate limiting
- Use HTTPS
- Sanitize all inputs
- Add proper error handling
- Implement WebSocket for true real-time

## 🌐 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Any ES6+ compatible browser

## 🎨 Customization

### Colors (CSS Variables)
```css
:root {
    --primary: #667eea;    /* Main brand color */
    --secondary: #764ba2;  /* Gradient end */
    --success: #48bb78;    /* Success states */
    --danger: #f56565;     /* Error/cancel */
    --warning: #ed8936;    /* Warnings */
}
```

### Business Rules (JavaScript)
```javascript
// Cancellation fee percentage
BookingManager.CANCELLATION_FEE_PERCENT = 10;

// Real-time polling interval (ms)
setInterval(() => RealTimeUpdates.check(), 3000);

// Payment success rate
const success = Math.random() < 0.95;
```

## 📱 Responsive Design

- Mobile-first approach
- Flexible grid system
- Modal dialogs
- Touch-friendly buttons
- Readable on all screen sizes

## 🔮 Future Enhancements

- [ ] GPS/Maps integration (Google Maps API)
- [ ] Real WebSocket connections
- [ ] Push notifications (Service Workers)
- [ ] Actual email service (EmailJS, SendGrid)
- [ ] Payment gateway integration (Stripe, PayFast)
- [ ] User ratings and reviews
- [ ] Trip history with maps
- [ ] Driver verification system
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Recurring bookings
- [ ] Group bookings
- [ ] Promotional codes

## 🐛 Known Limitations

1. **No real persistence**: Data resets on localStorage clear
2. **Single browser**: Can't sync across devices
3. **Mock payments**: No actual money transfers
4. **Mock emails**: Logged to console only
5. **Polling vs WebSocket**: Not true real-time
6. **No authentication tokens**: Session not secure

## 📝 License

MIT License - Free to use and modify.

## 🙏 Credits

Built with vanilla JavaScript, CSS3, and HTML5.
No frameworks or libraries required.

---

**Total Features Implemented:**
- ✅ User authentication (signup/login)
- ✅ Role-based access (driver/passenger)
- ✅ Vehicle management
- ✅ Route search with autocomplete
- ✅ Seat booking with availability check
- ✅ Pickup location selection (rank/hiking)
- ✅ Driver accept/decline workflow
- ✅ Real-time status updates
- ✅ In-app messaging
- ✅ Notification system
- ✅ Mock payment gateway (3 methods)
- ✅ Email notifications (mock)
- ✅ Cancellation with fees
- ✅ Receipt generation
- ✅ Earnings tracking
- ✅ Responsive design
