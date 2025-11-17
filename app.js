// RankGo Taxi - Enhanced Application with Real-time Features

// =============================================
// Data Store (LocalStorage)
// =============================================
const Store = {
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    
    remove(key) {
        localStorage.removeItem(key);
    },
    
    init() {
        if (!this.get('users')) this.set('users', []);
        if (!this.get('vehicles')) this.set('vehicles', []);
        if (!this.get('bookings')) this.set('bookings', []);
        if (!this.get('transactions')) this.set('transactions', []);
        if (!this.get('messages')) this.set('messages', []);
        if (!this.get('notifications')) this.set('notifications', []);
        if (!this.get('routes')) {
            // Pre-populate common routes for suggestions
            this.set('routes', [
                'Johannesburg CBD', 'Sandton', 'Soweto', 'Alexandra', 'Randburg',
                'Midrand', 'Pretoria', 'Centurion', 'Roodepoort', 'Kempton Park',
                'Germiston', 'Boksburg', 'Benoni', 'Springs', 'Vereeniging',
                'Vanderbijlpark', 'Krugersdorp', 'Fourways', 'Rosebank', 'Braamfontein',
                'Hillbrow', 'Yeoville', 'Berea', 'Newtown', 'Melville', 'Auckland Park'
            ]);
        }
    }
};

Store.init();

// =============================================
// Authentication Module
// =============================================
const Auth = {
    currentUser: null,
    
    init() {
        const userData = Store.get('currentUser');
        if (userData) {
            this.currentUser = userData;
        }
    },
    
    signup(userData) {
        const users = Store.get('users') || [];
        
        if (users.find(u => u.email === userData.email)) {
            throw new Error('Email already registered');
        }
        
        const user = {
            id: this.generateId(),
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            role: userData.role,
            emailNotifications: userData.emailNotifications,
            createdAt: new Date().toISOString()
        };
        
        users.push(user);
        Store.set('users', users);
        
        return user;
    },
    
    login(email, password) {
        const users = Store.get('users') || [];
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            throw new Error('Invalid email or password');
        }
        
        this.currentUser = user;
        Store.set('currentUser', user);
        
        return user;
    },
    
    logout() {
        this.currentUser = null;
        Store.remove('currentUser');
    },
    
    isLoggedIn() {
        return this.currentUser !== null;
    },
    
    getUser(userId) {
        const users = Store.get('users') || [];
        return users.find(u => u.id === userId);
    },
    
    generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

Auth.init();

// =============================================
// Route Suggestions Module
// =============================================
const RouteSuggestions = {
    getRoutes() {
        return Store.get('routes') || [];
    },
    
    addRoute(route) {
        const routes = this.getRoutes();
        if (!routes.includes(route)) {
            routes.push(route);
            Store.set('routes', routes);
        }
    },
    
    search(query) {
        if (!query || query.length < 2) return [];
        
        const routes = this.getRoutes();
        const lowerQuery = query.toLowerCase();
        
        return routes
            .filter(r => r.toLowerCase().includes(lowerQuery))
            .slice(0, 8);
    }
};

// =============================================
// Vehicle Management Module
// =============================================
const VehicleManager = {
    add(vehicleData) {
        const vehicles = Store.get('vehicles') || [];
        
        const vehicle = {
            id: this.generateId(),
            driverId: Auth.currentUser.id,
            driverName: Auth.currentUser.name,
            name: vehicleData.name,
            origin: vehicleData.origin,
            destination: vehicleData.destination,
            totalSeats: parseInt(vehicleData.seats),
            pricePerSeat: parseFloat(vehicleData.price),
            departureTimes: vehicleData.times.split(',').map(t => t.trim()),
            createdAt: new Date().toISOString(),
            active: true
        };
        
        // Add routes to suggestions
        RouteSuggestions.addRoute(vehicleData.origin);
        RouteSuggestions.addRoute(vehicleData.destination);
        
        vehicles.push(vehicle);
        Store.set('vehicles', vehicles);
        
        return vehicle;
    },
    
    getByDriver(driverId) {
        const vehicles = Store.get('vehicles') || [];
        return vehicles.filter(v => v.driverId === driverId && v.active);
    },
    
    search(origin, destination) {
        const vehicles = Store.get('vehicles') || [];
        return vehicles.filter(v => {
            if (!v.active) return false;
            
            const matchOrigin = !origin || v.origin.toLowerCase().includes(origin.toLowerCase());
            const matchDest = !destination || v.destination.toLowerCase().includes(destination.toLowerCase());
            
            return matchOrigin && matchDest;
        });
    },
    
    getById(vehicleId) {
        const vehicles = Store.get('vehicles') || [];
        return vehicles.find(v => v.id === vehicleId);
    },
    
    getAvailableSeats(vehicleId, departureTime) {
        const vehicle = this.getById(vehicleId);
        if (!vehicle) return 0;
        
        const bookings = Store.get('bookings') || [];
        const bookedSeats = bookings
            .filter(b => b.vehicleId === vehicleId && 
                        b.departureTime === departureTime && 
                        !['cancelled', 'declined'].includes(b.status))
            .reduce((sum, b) => sum + b.seats, 0);
        
        return vehicle.totalSeats - bookedSeats;
    },
    
    delete(vehicleId) {
        const vehicles = Store.get('vehicles') || [];
        const index = vehicles.findIndex(v => v.id === vehicleId);
        if (index > -1) {
            vehicles[index].active = false;
            Store.set('vehicles', vehicles);
        }
    },
    
    generateId() {
        return 'veh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// =============================================
// Booking Module (Enhanced with Status)
// =============================================
const BookingManager = {
    CANCELLATION_FEE_PERCENT: 10,
    
    create(bookingData) {
        const bookings = Store.get('bookings') || [];
        
        const booking = {
            id: this.generateId(),
            passengerId: Auth.currentUser.id,
            passengerName: Auth.currentUser.name,
            passengerEmail: Auth.currentUser.email,
            passengerPhone: Auth.currentUser.phone,
            vehicleId: bookingData.vehicleId,
            vehicleName: bookingData.vehicleName,
            driverId: bookingData.driverId,
            driverName: bookingData.driverName,
            origin: bookingData.origin,
            destination: bookingData.destination,
            departureTime: bookingData.departureTime,
            seats: parseInt(bookingData.seats),
            pricePerSeat: parseFloat(bookingData.pricePerSeat),
            totalAmount: parseFloat(bookingData.totalAmount),
            pickupType: bookingData.pickupType,
            pickupAddress: bookingData.pickupAddress || null,
            status: 'requested', // requested, accepted, declined, pending_payment, paid, on_way, arriving, arrived, in_progress, completed, cancelled
            rideStatus: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        bookings.push(booking);
        Store.set('bookings', bookings);
        
        // Notify driver
        NotificationManager.create({
            userId: booking.driverId,
            type: 'new_request',
            title: 'New Ride Request',
            message: `${booking.passengerName} requested ${booking.seats} seat(s) for ${booking.origin} → ${booking.destination}`,
            bookingId: booking.id
        });
        
        return booking;
    },
    
    getByPassenger(passengerId) {
        const bookings = Store.get('bookings') || [];
        return bookings.filter(b => b.passengerId === passengerId).reverse();
    },
    
    getByDriver(driverId) {
        const bookings = Store.get('bookings') || [];
        return bookings.filter(b => b.driverId === driverId).reverse();
    },
    
    getPendingRequests(driverId) {
        const bookings = Store.get('bookings') || [];
        return bookings.filter(b => b.driverId === driverId && b.status === 'requested');
    },
    
    getActiveRides(userId, role) {
        const bookings = Store.get('bookings') || [];
        const activeStatuses = ['accepted', 'paid', 'on_way', 'arriving', 'arrived', 'in_progress'];
        
        if (role === 'passenger') {
            return bookings.filter(b => b.passengerId === userId && activeStatuses.includes(b.status));
        } else {
            return bookings.filter(b => b.driverId === userId && activeStatuses.includes(b.status));
        }
    },
    
    getById(bookingId) {
        const bookings = Store.get('bookings') || [];
        return bookings.find(b => b.id === bookingId);
    },
    
    updateStatus(bookingId, status, additionalData = {}) {
        const bookings = Store.get('bookings') || [];
        const index = bookings.findIndex(b => b.id === bookingId);
        
        if (index > -1) {
            bookings[index].status = status;
            bookings[index].updatedAt = new Date().toISOString();
            Object.assign(bookings[index], additionalData);
            Store.set('bookings', bookings);
            
            return bookings[index];
        }
        return null;
    },
    
    acceptRide(bookingId) {
        const booking = this.updateStatus(bookingId, 'accepted');
        if (booking) {
            NotificationManager.create({
                userId: booking.passengerId,
                type: 'ride_accepted',
                title: 'Ride Accepted!',
                message: `Your ride request for ${booking.vehicleName} has been accepted. Please proceed to payment.`,
                bookingId: booking.id
            });
            
            EmailService.send(booking.passengerEmail, 'ride_accepted', booking);
        }
        return booking;
    },
    
    declineRide(bookingId) {
        const booking = this.updateStatus(bookingId, 'declined');
        if (booking) {
            NotificationManager.create({
                userId: booking.passengerId,
                type: 'ride_declined',
                title: 'Ride Declined',
                message: `Your ride request for ${booking.vehicleName} was declined. Please try another vehicle.`,
                bookingId: booking.id
            });
            
            EmailService.send(booking.passengerEmail, 'ride_declined', booking);
        }
        return booking;
    },
    
    updateRideStatus(bookingId, rideStatus) {
        const statusMessages = {
            'on_way': 'Your driver is on the way!',
            'arriving': 'Your driver will arrive in 2 minutes!',
            'arrived': 'Your driver has arrived at the pickup point!',
            'in_progress': 'Your trip is in progress',
            'completed': 'Your trip has been completed. Thank you!'
        };
        
        const booking = this.updateStatus(bookingId, rideStatus);
        if (booking) {
            NotificationManager.create({
                userId: booking.passengerId,
                type: 'ride_update',
                title: 'Ride Update',
                message: statusMessages[rideStatus],
                bookingId: booking.id
            });
        }
        return booking;
    },
    
    cancelWithFee(bookingId) {
        const booking = this.getById(bookingId);
        if (!booking) return null;
        
        const fee = (booking.totalAmount * this.CANCELLATION_FEE_PERCENT) / 100;
        
        const updated = this.updateStatus(bookingId, 'cancelled', { cancellationFee: fee });
        
        if (updated) {
            // Notify driver
            NotificationManager.create({
                userId: booking.driverId,
                type: 'booking_cancelled',
                title: 'Booking Cancelled',
                message: `${booking.passengerName} cancelled their booking. Fee charged: R${fee.toFixed(2)}`,
                bookingId: booking.id
            });
            
            EmailService.send(booking.passengerEmail, 'cancellation', { ...booking, cancellationFee: fee });
        }
        
        return { booking: updated, fee };
    },
    
    generateId() {
        return 'BK' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
};

// =============================================
// Messaging Module
// =============================================
const MessagingManager = {
    sendMessage(toUserId, content, bookingId = null) {
        const messages = Store.get('messages') || [];
        
        const message = {
            id: this.generateId(),
            fromUserId: Auth.currentUser.id,
            fromUserName: Auth.currentUser.name,
            toUserId: toUserId,
            content: content,
            bookingId: bookingId,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        messages.push(message);
        Store.set('messages', messages);
        
        // Create notification
        NotificationManager.create({
            userId: toUserId,
            type: 'new_message',
            title: 'New Message',
            message: `${Auth.currentUser.name}: ${content.substring(0, 50)}...`,
            bookingId: bookingId
        });
        
        return message;
    },
    
    getConversation(userId1, userId2) {
        const messages = Store.get('messages') || [];
        return messages.filter(m => 
            (m.fromUserId === userId1 && m.toUserId === userId2) ||
            (m.fromUserId === userId2 && m.toUserId === userId1)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    
    getChats(userId) {
        const messages = Store.get('messages') || [];
        const bookings = Store.get('bookings') || [];
        const chatMap = new Map();
        
        // Get all users this person has bookings with
        bookings.forEach(b => {
            if (b.passengerId === userId && !chatMap.has(b.driverId)) {
                const user = Auth.getUser(b.driverId);
                if (user) {
                    chatMap.set(b.driverId, {
                        odatUserId: b.driverId,
                        name: user.name,
                        lastMessage: null,
                        unreadCount: 0
                    });
                }
            } else if (b.driverId === userId && !chatMap.has(b.passengerId)) {
                const user = Auth.getUser(b.passengerId);
                if (user) {
                    chatMap.set(b.passengerId, {
                        userId: b.passengerId,
                        name: user.name,
                        lastMessage: null,
                        unreadCount: 0
                    });
                }
            }
        });
        
        // Get last message and unread count for each chat
        messages.forEach(m => {
            const otherUserId = m.fromUserId === userId ? m.toUserId : m.fromUserId;
            if (chatMap.has(otherUserId)) {
                const chat = chatMap.get(otherUserId);
                if (!chat.lastMessage || new Date(m.timestamp) > new Date(chat.lastMessage.timestamp)) {
                    chat.lastMessage = m;
                }
                if (m.toUserId === userId && !m.read) {
                    chat.unreadCount++;
                }
            }
        });
        
        return Array.from(chatMap.values()).sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
        });
    },
    
    markAsRead(fromUserId) {
        const messages = Store.get('messages') || [];
        let updated = false;
        
        messages.forEach(m => {
            if (m.fromUserId === fromUserId && m.toUserId === Auth.currentUser.id && !m.read) {
                m.read = true;
                updated = true;
            }
        });
        
        if (updated) {
            Store.set('messages', messages);
        }
    },
    
    generateId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// =============================================
// Notification Module
// =============================================
const NotificationManager = {
    create(notifData) {
        const notifications = Store.get('notifications') || [];
        
        const notification = {
            id: this.generateId(),
            userId: notifData.userId,
            type: notifData.type,
            title: notifData.title,
            message: notifData.message,
            bookingId: notifData.bookingId || null,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        notifications.push(notification);
        Store.set('notifications', notifications);
        
        return notification;
    },
    
    getForUser(userId) {
        const notifications = Store.get('notifications') || [];
        return notifications.filter(n => n.userId === userId).reverse();
    },
    
    getUnreadCount(userId) {
        const notifications = Store.get('notifications') || [];
        return notifications.filter(n => n.userId === userId && !n.read).length;
    },
    
    markAsRead(notifId) {
        const notifications = Store.get('notifications') || [];
        const index = notifications.findIndex(n => n.id === notifId);
        if (index > -1) {
            notifications[index].read = true;
            Store.set('notifications', notifications);
        }
    },
    
    markAllAsRead(userId) {
        const notifications = Store.get('notifications') || [];
        notifications.forEach(n => {
            if (n.userId === userId) {
                n.read = true;
            }
        });
        Store.set('notifications', notifications);
    },
    
    clearAll(userId) {
        const notifications = Store.get('notifications') || [];
        const filtered = notifications.filter(n => n.userId !== userId);
        Store.set('notifications', filtered);
    },
    
    generateId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// =============================================
// Email Service (Mock)
// =============================================
const EmailService = {
    queue: [],
    
    send(toEmail, type, data) {
        const emailContent = this.generateContent(type, data);
        
        const email = {
            id: 'email_' + Date.now(),
            to: toEmail,
            subject: emailContent.subject,
            body: emailContent.body,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };
        
        // Store in queue (mock sending)
        this.queue.push(email);
        
        // Log to console for demo
        console.log('📧 Email Sent:', email);
        
        // Store sent emails
        const sentEmails = Store.get('sentEmails') || [];
        sentEmails.push(email);
        Store.set('sentEmails', sentEmails);
        
        return email;
    },
    
    generateContent(type, data) {
        const templates = {
            booking_confirmation: {
                subject: `RankGo Taxi - Booking Confirmation #${data.id}`,
                body: `
Dear ${data.passengerName},

Your booking has been confirmed!

Booking Details:
- Booking ID: ${data.id}
- Taxi: ${data.vehicleName}
- Route: ${data.origin} → ${data.destination}
- Departure: ${data.departureTime}
- Seats: ${data.seats}
- Pickup: ${data.pickupType === 'rank' ? 'Taxi Rank' : `Hiking Spot - ${data.pickupAddress}`}
- Total Paid: R${data.totalAmount.toFixed(2)}

Your driver will be notified and you can track your ride status in the app.

Thank you for choosing RankGo Taxi!
                `.trim()
            },
            ride_accepted: {
                subject: `RankGo Taxi - Ride Request Accepted`,
                body: `
Dear ${data.passengerName},

Great news! Your ride request has been accepted.

Booking Details:
- Taxi: ${data.vehicleName}
- Route: ${data.origin} → ${data.destination}
- Departure: ${data.departureTime}

Please proceed to payment to confirm your booking.

Thank you for choosing RankGo Taxi!
                `.trim()
            },
            ride_declined: {
                subject: `RankGo Taxi - Ride Request Update`,
                body: `
Dear ${data.passengerName},

Unfortunately, your ride request could not be accepted at this time.

Please try booking another available vehicle.

Thank you for your understanding.
                `.trim()
            },
            cancellation: {
                subject: `RankGo Taxi - Booking Cancelled`,
                body: `
Dear ${data.passengerName},

Your booking has been cancelled.

Cancellation Fee: R${data.cancellationFee.toFixed(2)} (10% of booking amount)

If you need to book again, please visit our app.

Thank you for choosing RankGo Taxi!
                `.trim()
            }
        };
        
        return templates[type] || { subject: 'RankGo Taxi Notification', body: 'You have a new notification.' };
    }
};

// =============================================
// Payment Gateway (Mock)
// =============================================
const PaymentGateway = {
    processPayment(paymentData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (paymentData.method === 'card') {
                    if (!this.validateCard(paymentData.cardNumber)) {
                        reject(new Error('Invalid card number'));
                        return;
                    }
                    if (!this.validateExpiry(paymentData.expiry)) {
                        reject(new Error('Card has expired'));
                        return;
                    }
                    if (!this.validateCVV(paymentData.cvv)) {
                        reject(new Error('Invalid CVV'));
                        return;
                    }
                }
                
                const success = Math.random() < 0.95;
                
                if (success) {
                    const transaction = {
                        id: this.generateTransactionId(),
                        bookingId: paymentData.bookingId,
                        amount: paymentData.amount,
                        method: paymentData.method,
                        status: 'successful',
                        timestamp: new Date().toISOString(),
                        reference: this.generateReference()
                    };
                    
                    const transactions = Store.get('transactions') || [];
                    transactions.push(transaction);
                    Store.set('transactions', transactions);
                    
                    BookingManager.updateStatus(paymentData.bookingId, 'paid');
                    
                    resolve(transaction);
                } else {
                    reject(new Error('Payment declined. Please try again.'));
                }
            }, 2000);
        });
    },
    
    validateCard(number) {
        const cleaned = number.replace(/\s/g, '');
        return /^\d{13,19}$/.test(cleaned);
    },
    
    validateExpiry(expiry) {
        const [month, year] = expiry.split('/');
        if (!month || !year) return false;
        const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        return expDate > new Date();
    },
    
    validateCVV(cvv) {
        return /^\d{3,4}$/.test(cvv);
    },
    
    generateTransactionId() {
        return 'TXN' + Date.now().toString() + Math.random().toString(36).substr(2, 6).toUpperCase();
    },
    
    generateReference() {
        return 'REF' + Math.random().toString(36).substr(2, 10).toUpperCase();
    }
};

// =============================================
// Real-time Updates (Polling Simulation)
// =============================================
const RealTimeUpdates = {
    interval: null,
    lastCheck: null,
    
    start() {
        this.lastCheck = new Date().toISOString();
        this.interval = setInterval(() => this.check(), 3000); // Check every 3 seconds
    },
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },
    
    check() {
        if (!Auth.isLoggedIn()) return;
        
        // Check for new notifications
        const unreadCount = NotificationManager.getUnreadCount(Auth.currentUser.id);
        this.updateNotificationBadge(unreadCount);
        
        // Check for ride status updates
        const activeRides = BookingManager.getActiveRides(Auth.currentUser.id, Auth.currentUser.role);
        this.updateStatusBanner(activeRides);
        
        // Update pending requests count for drivers
        if (Auth.currentUser.role === 'driver') {
            const pending = BookingManager.getPendingRequests(Auth.currentUser.id);
            this.updatePendingAlert(pending.length);
        }
    },
    
    updateNotificationBadge(count) {
        const badge = document.getElementById('notifBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    },
    
    updateStatusBanner(activeRides) {
        const banner = document.getElementById('statusBanner');
        const textEl = document.getElementById('statusText');
        
        if (!banner || !textEl) return;
        
        if (activeRides.length > 0) {
            const ride = activeRides[0];
            const statusMessages = {
                'accepted': `Your booking for ${ride.vehicleName} has been accepted. Please complete payment.`,
                'paid': `Booking confirmed! Waiting for your driver to start the trip.`,
                'on_way': `🚕 Your driver (${ride.driverName}) is on the way!`,
                'arriving': `⏰ Your driver will arrive in 2 minutes!`,
                'arrived': `📍 Your driver has arrived at ${ride.pickupType === 'rank' ? 'the taxi rank' : ride.pickupAddress}!`,
                'in_progress': `🚗 You're on your way to ${ride.destination}!`
            };
            
            if (statusMessages[ride.status]) {
                textEl.textContent = statusMessages[ride.status];
                banner.style.display = 'flex';
            }
        } else {
            banner.style.display = 'none';
        }
    },
    
    updatePendingAlert(count) {
        const alert = document.getElementById('pendingAlert');
        const countEl = document.getElementById('pendingCount');
        
        if (alert && countEl) {
            if (count > 0) {
                countEl.textContent = count;
                alert.style.display = 'flex';
            } else {
                alert.style.display = 'none';
            }
        }
    }
};

// =============================================
// UI Controllers
// =============================================

// Login Page Controller
const LoginController = {
    init() {
        const form = document.getElementById('loginForm');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    },
    
    handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const hint = document.getElementById('loginHint');
        
        try {
            const user = Auth.login(email, password);
            hint.textContent = 'Login successful! Redirecting...';
            hint.className = 'hint success';
            
            setTimeout(() => {
                window.location.href = user.role === 'driver' ? 'driver.html' : 'passenger.html';
            }, 1000);
        } catch (error) {
            hint.textContent = error.message;
            hint.className = 'hint';
        }
    }
};

// Signup Page Controller
const SignupController = {
    init() {
        const form = document.getElementById('signupForm');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });
    },
    
    handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const hint = document.getElementById('signupHint');
        
        if (password !== confirm) {
            hint.textContent = 'Passwords do not match';
            return;
        }
        
        try {
            Auth.signup({ name, email, phone, password, role, emailNotifications });
            hint.textContent = 'Account created successfully! Redirecting to login...';
            hint.className = 'hint success';
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            hint.textContent = error.message;
            hint.className = 'hint';
        }
    }
};

// Passenger Page Controller
const PassengerController = {
    selectedVehicle: null,
    selectedTime: null,
    currentChatUserId: null,
    cancelBookingId: null,
    
    init() {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }
        
        if (Auth.currentUser.role !== 'passenger') {
            window.location.href = 'driver.html';
            return;
        }
        
        this.updateUserBadge();
        this.setupEventListeners();
        this.setupAutocomplete();
        this.loadAllVehicles();
        this.loadActiveRides();
        this.loadBookings();
        
        // Start real-time updates
        RealTimeUpdates.start();
    },
    
    updateUserBadge() {
        const badge = document.getElementById('userBadge');
        if (badge) {
            badge.textContent = Auth.currentUser.name;
        }
    },
    
    setupEventListeners() {
        const searchBtn = document.getElementById('searchBtn');
        const closeModal = document.getElementById('closeModal');
        const confirmBooking = document.getElementById('confirmBooking');
        const seatCount = document.getElementById('seatCount');
        const logoutBtn = document.getElementById('logoutBtn');
        const notifBtn = document.getElementById('notifBtn');
        const msgBtn = document.getElementById('msgBtn');
        const closeMsgModal = document.getElementById('closeMsgModal');
        const closeChatModal = document.getElementById('closeChatModal');
        const backToChats = document.getElementById('backToChats');
        const sendMessage = document.getElementById('sendMessage');
        const messageInput = document.getElementById('messageInput');
        const clearNotifs = document.getElementById('clearNotifs');
        const cancelNo = document.getElementById('cancelNo');
        const cancelYes = document.getElementById('cancelYes');
        
        // Pickup type toggle
        const pickupTypes = document.querySelectorAll('input[name="pickupType"]');
        pickupTypes.forEach(radio => {
            radio.addEventListener('change', () => {
                const hikingDetails = document.getElementById('hikingDetails');
                hikingDetails.style.display = radio.value === 'hiking' ? 'block' : 'none';
            });
        });
        
        if (searchBtn) searchBtn.addEventListener('click', () => this.searchRoutes());
        if (closeModal) closeModal.addEventListener('click', () => this.closeBookingModal());
        if (confirmBooking) confirmBooking.addEventListener('click', () => this.confirmBooking());
        if (seatCount) seatCount.addEventListener('change', () => this.updateTotal());
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                RealTimeUpdates.stop();
                Auth.logout();
                window.location.href = 'index.html';
            });
        }
        
        if (notifBtn) {
            notifBtn.addEventListener('click', () => this.toggleNotifications());
        }
        
        if (msgBtn) {
            msgBtn.addEventListener('click', () => this.openMessagesModal());
        }
        
        if (closeMsgModal) {
            closeMsgModal.addEventListener('click', () => {
                document.getElementById('messagesModal').classList.remove('active');
            });
        }
        
        if (closeChatModal) {
            closeChatModal.addEventListener('click', () => {
                document.getElementById('chatModal').classList.remove('active');
            });
        }
        
        if (backToChats) {
            backToChats.addEventListener('click', () => {
                document.getElementById('chatModal').classList.remove('active');
                this.openMessagesModal();
            });
        }
        
        if (sendMessage) {
            sendMessage.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
        }
        
        if (clearNotifs) {
            clearNotifs.addEventListener('click', () => {
                NotificationManager.clearAll(Auth.currentUser.id);
                this.loadNotifications();
            });
        }
        
        if (cancelNo) {
            cancelNo.addEventListener('click', () => {
                document.getElementById('cancelModal').classList.remove('active');
            });
        }
        
        if (cancelYes) {
            cancelYes.addEventListener('click', () => this.processCancellation());
        }
        
        // Close notifications when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notifPanel');
            const btn = document.getElementById('notifBtn');
            if (panel && !panel.contains(e.target) && e.target !== btn) {
                panel.style.display = 'none';
            }
        });
    },
    
    setupAutocomplete() {
        const originInput = document.getElementById('searchOrigin');
        const destInput = document.getElementById('searchDest');
        const originSuggestions = document.getElementById('originSuggestions');
        const destSuggestions = document.getElementById('destSuggestions');
        
        if (originInput && originSuggestions) {
            this.setupAutocompleteField(originInput, originSuggestions);
        }
        
        if (destInput && destSuggestions) {
            this.setupAutocompleteField(destInput, destSuggestions);
        }
    },
    
    setupAutocompleteField(input, suggestionsEl) {
        input.addEventListener('input', () => {
            const query = input.value;
            const suggestions = RouteSuggestions.search(query);
            
            if (suggestions.length > 0) {
                suggestionsEl.innerHTML = suggestions.map(s => 
                    `<div class="suggestion-item" onclick="PassengerController.selectSuggestion('${input.id}', '${s}')">${s}</div>`
                ).join('');
                suggestionsEl.classList.add('active');
            } else {
                suggestionsEl.classList.remove('active');
            }
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => suggestionsEl.classList.remove('active'), 200);
        });
    },
    
    selectSuggestion(inputId, value) {
        document.getElementById(inputId).value = value;
        document.getElementById(inputId === 'searchOrigin' ? 'originSuggestions' : 'destSuggestions').classList.remove('active');
    },
    
    loadAllVehicles() {
        const results = document.getElementById('searchResults');
        if (!results) return;
        
        const vehicles = VehicleManager.search('', '');
        
        if (vehicles.length === 0) {
            results.innerHTML = '<div class="empty-state"><p>No taxis available. Check back later!</p></div>';
            return;
        }
        
        results.innerHTML = '<h3>Available Taxis</h3>' + vehicles.map(v => this.renderVehicleCard(v)).join('');
    },
    
    searchRoutes() {
        const origin = document.getElementById('searchOrigin').value;
        const dest = document.getElementById('searchDest').value;
        const results = document.getElementById('searchResults');
        
        const vehicles = VehicleManager.search(origin, dest);
        
        if (vehicles.length === 0) {
            results.innerHTML = '<div class="empty-state"><p>No routes found. Try different search terms.</p></div>';
            return;
        }
        
        results.innerHTML = '<h3>Search Results</h3>' + vehicles.map(v => this.renderVehicleCard(v)).join('');
    },
    
    renderVehicleCard(vehicle) {
        return `
            <div class="vehicle-card">
                <h3>${vehicle.name}</h3>
                <div class="vehicle-info">
                    <span><strong>From:</strong> ${vehicle.origin}</span>
                    <span><strong>To:</strong> ${vehicle.destination}</span>
                    <span><strong>Price:</strong> R${vehicle.pricePerSeat}/seat</span>
                    <span><strong>Driver:</strong> ${vehicle.driverName}</span>
                </div>
                <div class="vehicle-times">
                    ${vehicle.departureTimes.map(time => {
                        const available = VehicleManager.getAvailableSeats(vehicle.id, time);
                        return `
                            <button class="time-badge ${available === 0 ? '' : ''}" 
                                    onclick="PassengerController.openBookingModal('${vehicle.id}', '${time}')"
                                    ${available === 0 ? 'disabled' : ''}>
                                ${time} (${available} seats)
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },
    
    openBookingModal(vehicleId, time) {
        this.selectedVehicle = VehicleManager.getById(vehicleId);
        this.selectedTime = time;
        
        const modal = document.getElementById('bookingModal');
        const details = document.getElementById('modalDetails');
        const seatInput = document.getElementById('seatCount');
        
        const available = VehicleManager.getAvailableSeats(vehicleId, time);
        seatInput.max = available;
        seatInput.value = 1;
        
        details.innerHTML = `
            <p><strong>Taxi:</strong> ${this.selectedVehicle.name}</p>
            <p><strong>Driver:</strong> ${this.selectedVehicle.driverName}</p>
            <p><strong>Route:</strong> ${this.selectedVehicle.origin} → ${this.selectedVehicle.destination}</p>
            <p><strong>Departure:</strong> ${time}</p>
            <p><strong>Price:</strong> R${this.selectedVehicle.pricePerSeat} per seat</p>
            <p><strong>Available:</strong> ${available} seats</p>
        `;
        
        this.updateTotal();
        modal.classList.add('active');
    },
    
    closeBookingModal() {
        const modal = document.getElementById('bookingModal');
        modal.classList.remove('active');
        this.selectedVehicle = null;
        this.selectedTime = null;
    },
    
    updateTotal() {
        const seats = parseInt(document.getElementById('seatCount').value) || 1;
        const total = seats * this.selectedVehicle.pricePerSeat;
        document.getElementById('bookingTotal').textContent = total.toFixed(2);
    },
    
    confirmBooking() {
        const seats = parseInt(document.getElementById('seatCount').value);
        const available = VehicleManager.getAvailableSeats(this.selectedVehicle.id, this.selectedTime);
        const pickupType = document.querySelector('input[name="pickupType"]:checked').value;
        const pickupAddress = pickupType === 'hiking' ? document.getElementById('pickupAddress').value : null;
        
        if (seats > available) {
            alert('Not enough seats available');
            return;
        }
        
        if (pickupType === 'hiking' && !pickupAddress) {
            alert('Please enter your pickup address');
            return;
        }
        
        const bookingData = {
            vehicleId: this.selectedVehicle.id,
            vehicleName: this.selectedVehicle.name,
            driverId: this.selectedVehicle.driverId,
            driverName: this.selectedVehicle.driverName,
            origin: this.selectedVehicle.origin,
            destination: this.selectedVehicle.destination,
            departureTime: this.selectedTime,
            seats: seats,
            pricePerSeat: this.selectedVehicle.pricePerSeat,
            totalAmount: seats * this.selectedVehicle.pricePerSeat,
            pickupType: pickupType,
            pickupAddress: pickupAddress
        };
        
        const booking = BookingManager.create(bookingData);
        
        this.closeBookingModal();
        
        // Show success message
        alert('Ride request sent! The driver will review your request.');
        
        // Refresh views
        this.loadActiveRides();
        this.loadBookings();
        this.loadAllVehicles();
    },
    
    loadActiveRides() {
        const container = document.getElementById('activeRides');
        if (!container) return;
        
        const rides = BookingManager.getActiveRides(Auth.currentUser.id, 'passenger');
        
        if (rides.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No active rides</p></div>';
            return;
        }
        
        container.innerHTML = rides.map(b => this.renderActiveRideCard(b)).join('');
    },
    
    renderActiveRideCard(booking) {
        const statusLabels = {
            'accepted': 'Awaiting Payment',
            'paid': 'Confirmed',
            'on_way': 'Driver On Way',
            'arriving': 'Arriving Soon',
            'arrived': 'Driver Arrived',
            'in_progress': 'In Progress'
        };
        
        return `
            <div class="booking-card active">
                <div class="booking-header">
                    <h3>${booking.vehicleName}</h3>
                    <span class="booking-status ${booking.status}">${statusLabels[booking.status] || booking.status.toUpperCase()}</span>
                </div>
                <div class="vehicle-info">
                    <span><strong>Route:</strong> ${booking.origin} → ${booking.destination}</span>
                    <span><strong>Departure:</strong> ${booking.departureTime}</span>
                    <span><strong>Seats:</strong> ${booking.seats}</span>
                    <span><strong>Driver:</strong> ${booking.driverName}</span>
                </div>
                <div class="small">
                    Pickup: ${booking.pickupType === 'rank' ? '🚏 Taxi Rank' : `👍 ${booking.pickupAddress}`}
                </div>
                <div class="vehicle-actions">
                    <button class="btn info" onclick="PassengerController.openChat('${booking.driverId}')">💬 Message Driver</button>
                    ${booking.status === 'accepted' ? `
                        <button class="btn success" onclick="PassengerController.payBooking('${booking.id}')">Pay Now</button>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    loadBookings() {
        const container = document.getElementById('myBookings');
        if (!container) return;
        
        const bookings = BookingManager.getByPassenger(Auth.currentUser.id);
        const nonActiveStatuses = ['requested', 'declined', 'cancelled', 'completed', 'pending_payment'];
        const filteredBookings = bookings.filter(b => nonActiveStatuses.includes(b.status) || b.status === 'requested');
        
        if (filteredBookings.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No bookings yet. Search for a taxi to get started!</p></div>';
            return;
        }
        
        container.innerHTML = filteredBookings.map(b => this.renderBookingCard(b)).join('');
    },
    
    renderBookingCard(booking) {
        const statusLabels = {
            'requested': 'Pending Approval',
            'declined': 'Declined',
            'cancelled': 'Cancelled',
            'completed': 'Completed'
        };
        
        return `
            <div class="booking-card ${booking.status}">
                <div class="booking-header">
                    <h3>${booking.vehicleName}</h3>
                    <span class="booking-status ${booking.status}">${statusLabels[booking.status] || booking.status.toUpperCase()}</span>
                </div>
                <div class="vehicle-info">
                    <span><strong>Route:</strong> ${booking.origin} → ${booking.destination}</span>
                    <span><strong>Departure:</strong> ${booking.departureTime}</span>
                    <span><strong>Seats:</strong> ${booking.seats}</span>
                    <span><strong>Total:</strong> R${booking.totalAmount.toFixed(2)}</span>
                </div>
                <div class="small">
                    Booking ID: ${booking.id} | Pickup: ${booking.pickupType === 'rank' ? 'Taxi Rank' : booking.pickupAddress}
                    ${booking.cancellationFee ? `<br>Cancellation Fee: R${booking.cancellationFee.toFixed(2)}` : ''}
                </div>
                ${booking.status === 'requested' ? `
                    <div class="vehicle-actions">
                        <button class="btn danger" onclick="PassengerController.showCancelModal('${booking.id}')">Cancel Request</button>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    payBooking(bookingId) {
        const booking = BookingManager.getById(bookingId);
        Store.set('pendingBooking', booking);
        window.location.href = 'pay.html';
    },
    
    showCancelModal(bookingId) {
        this.cancelBookingId = bookingId;
        const booking = BookingManager.getById(bookingId);
        const fee = (booking.totalAmount * BookingManager.CANCELLATION_FEE_PERCENT) / 100;
        
        document.getElementById('cancelFee').textContent = fee.toFixed(2);
        document.getElementById('cancelModal').classList.add('active');
    },
    
    processCancellation() {
        if (!this.cancelBookingId) return;
        
        const result = BookingManager.cancelWithFee(this.cancelBookingId);
        
        document.getElementById('cancelModal').classList.remove('active');
        
        alert(`Booking cancelled. A cancellation fee of R${result.fee.toFixed(2)} has been charged.`);
        
        this.loadActiveRides();
        this.loadBookings();
        this.loadAllVehicles();
        
        this.cancelBookingId = null;
    },
    
    toggleNotifications() {
        const panel = document.getElementById('notifPanel');
        if (panel.style.display === 'none') {
            this.loadNotifications();
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    },
    
    loadNotifications() {
        const list = document.getElementById('notifList');
        if (!list) return;
        
        const notifications = NotificationManager.getForUser(Auth.currentUser.id);
        
        if (notifications.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
            return;
        }
        
        list.innerHTML = notifications.slice(0, 20).map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="PassengerController.handleNotification('${n.id}')">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${this.formatTime(n.timestamp)}</div>
            </div>
        `).join('');
    },
    
    handleNotification(notifId) {
        NotificationManager.markAsRead(notifId);
        this.loadNotifications();
        RealTimeUpdates.check();
        
        // Refresh relevant views
        this.loadActiveRides();
        this.loadBookings();
    },
    
    openMessagesModal() {
        const modal = document.getElementById('messagesModal');
        const chatList = document.getElementById('chatList');
        
        const chats = MessagingManager.getChats(Auth.currentUser.id);
        
        if (chats.length === 0) {
            chatList.innerHTML = '<div class="empty-state"><p>No conversations yet</p></div>';
        } else {
            chatList.innerHTML = chats.map(chat => `
                <div class="chat-item" onclick="PassengerController.openChat('${chat.odatUserId || chat.userId}')">
                    <div class="chat-avatar">${chat.name.charAt(0).toUpperCase()}</div>
                    <div class="chat-info">
                        <div class="chat-name">${chat.name}</div>
                        <div class="chat-preview">${chat.lastMessage ? chat.lastMessage.content : 'No messages yet'}</div>
                    </div>
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
            `).join('');
        }
        
        modal.classList.add('active');
    },
    
    openChat(userId) {
        this.currentChatUserId = userId;
        const user = Auth.getUser(userId);
        
        document.getElementById('messagesModal').classList.remove('active');
        document.getElementById('chatWith').textContent = user ? user.name : 'User';
        
        MessagingManager.markAsRead(userId);
        this.loadChatMessages(userId);
        
        document.getElementById('chatModal').classList.add('active');
    },
    
    loadChatMessages(userId) {
        const container = document.getElementById('chatMessages');
        const messages = MessagingManager.getConversation(Auth.currentUser.id, userId);
        
        container.innerHTML = messages.map(m => `
            <div class="message ${m.fromUserId === Auth.currentUser.id ? 'sent' : 'received'}">
                <div class="message-bubble">${m.content}</div>
                <div class="message-time">${this.formatTime(m.timestamp)}</div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    },
    
    sendChatMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentChatUserId) return;
        
        MessagingManager.sendMessage(this.currentChatUserId, content);
        input.value = '';
        
        this.loadChatMessages(this.currentChatUserId);
    },
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
};

// Driver Page Controller
const DriverController = {
    currentChatUserId: null,
    currentStatusBookingId: null,
    
    init() {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }
        
        if (Auth.currentUser.role !== 'driver') {
            window.location.href = 'passenger.html';
            return;
        }
        
        this.updateUserBadge();
        this.setupEventListeners();
        this.loadPendingRequests();
        this.loadActiveRides();
        this.loadVehicles();
        this.loadBookings();
        this.updateEarnings();
        
        RealTimeUpdates.start();
    },
    
    updateUserBadge() {
        const badge = document.getElementById('userBadge');
        if (badge) {
            badge.textContent = Auth.currentUser.name;
        }
    },
    
    setupEventListeners() {
        const form = document.getElementById('addVehicleForm');
        const logoutBtn = document.getElementById('logoutBtn');
        const notifBtn = document.getElementById('notifBtn');
        const msgBtn = document.getElementById('msgBtn');
        const closeMsgModal = document.getElementById('closeMsgModal');
        const closeChatModal = document.getElementById('closeChatModal');
        const closeStatusModal = document.getElementById('closeStatusModal');
        const backToChats = document.getElementById('backToChats');
        const sendMessage = document.getElementById('sendMessage');
        const messageInput = document.getElementById('messageInput');
        const clearNotifs = document.getElementById('clearNotifs');
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addVehicle();
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                RealTimeUpdates.stop();
                Auth.logout();
                window.location.href = 'index.html';
            });
        }
        
        if (notifBtn) {
            notifBtn.addEventListener('click', () => this.toggleNotifications());
        }
        
        if (msgBtn) {
            msgBtn.addEventListener('click', () => this.openMessagesModal());
        }
        
        if (closeMsgModal) {
            closeMsgModal.addEventListener('click', () => {
                document.getElementById('messagesModal').classList.remove('active');
            });
        }
        
        if (closeChatModal) {
            closeChatModal.addEventListener('click', () => {
                document.getElementById('chatModal').classList.remove('active');
            });
        }
        
        if (closeStatusModal) {
            closeStatusModal.addEventListener('click', () => {
                document.getElementById('statusModal').classList.remove('active');
            });
        }
        
        if (backToChats) {
            backToChats.addEventListener('click', () => {
                document.getElementById('chatModal').classList.remove('active');
                this.openMessagesModal();
            });
        }
        
        if (sendMessage) {
            sendMessage.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
        }
        
        if (clearNotifs) {
            clearNotifs.addEventListener('click', () => {
                NotificationManager.clearAll(Auth.currentUser.id);
                this.loadNotifications();
            });
        }
        
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notifPanel');
            const btn = document.getElementById('notifBtn');
            if (panel && !panel.contains(e.target) && e.target !== btn) {
                panel.style.display = 'none';
            }
        });
    },
    
    addVehicle() {
        const hint = document.getElementById('vHint');
        
        const vehicleData = {
            name: document.getElementById('vName').value,
            origin: document.getElementById('vOrigin').value,
            destination: document.getElementById('vDest').value,
            seats: document.getElementById('vSeats').value,
            price: document.getElementById('vPrice').value,
            times: document.getElementById('vTimes').value
        };
        
        try {
            VehicleManager.add(vehicleData);
            hint.textContent = 'Vehicle added successfully!';
            hint.className = 'hint success';
            
            document.getElementById('addVehicleForm').reset();
            document.getElementById('vSeats').value = 15;
            document.getElementById('vPrice').value = 30;
            
            this.loadVehicles();
            
            setTimeout(() => {
                hint.textContent = '';
            }, 3000);
        } catch (error) {
            hint.textContent = error.message;
            hint.className = 'hint';
        }
    },
    
    loadPendingRequests() {
        const container = document.getElementById('pendingRequests');
        if (!container) return;
        
        const requests = BookingManager.getPendingRequests(Auth.currentUser.id);
        
        if (requests.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No pending requests</p></div>';
            document.getElementById('pendingRequestsCard').style.display = 'none';
            return;
        }
        
        document.getElementById('pendingRequestsCard').style.display = 'block';
        container.innerHTML = requests.map(r => this.renderRequestCard(r)).join('');
    },
    
    renderRequestCard(booking) {
        return `
            <div class="booking-card requested">
                <div class="booking-header">
                    <h3>${booking.passengerName}</h3>
                    <span class="booking-status requested">PENDING</span>
                </div>
                <div class="vehicle-info">
                    <span><strong>Vehicle:</strong> ${booking.vehicleName}</span>
                    <span><strong>Route:</strong> ${booking.origin} → ${booking.destination}</span>
                    <span><strong>Time:</strong> ${booking.departureTime}</span>
                    <span><strong>Seats:</strong> ${booking.seats}</span>
                </div>
                <div class="small">
                    Pickup: ${booking.pickupType === 'rank' ? '🚏 Taxi Rank' : `👍 ${booking.pickupAddress}`}
                    <br>Phone: ${booking.passengerPhone}
                </div>
                <div class="vehicle-actions">
                    <button class="btn success" onclick="DriverController.acceptRide('${booking.id}')">✓ Accept</button>
                    <button class="btn danger" onclick="DriverController.declineRide('${booking.id}')">✗ Decline</button>
                    <button class="btn info" onclick="DriverController.openChat('${booking.passengerId}')">💬 Message</button>
                </div>
            </div>
        `;
    },
    
    acceptRide(bookingId) {
        BookingManager.acceptRide(bookingId);
        this.loadPendingRequests();
        this.loadActiveRides();
        this.loadBookings();
        RealTimeUpdates.check();
    },
    
    declineRide(bookingId) {
        if (confirm('Are you sure you want to decline this ride request?')) {
            BookingManager.declineRide(bookingId);
            this.loadPendingRequests();
            RealTimeUpdates.check();
        }
    },
    
    loadActiveRides() {
        const container = document.getElementById('activeRides');
        if (!container) return;
        
        const rides = BookingManager.getActiveRides(Auth.currentUser.id, 'driver');
        
        if (rides.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No active rides</p></div>';
            return;
        }
        
        container.innerHTML = rides.map(b => this.renderActiveRideCard(b)).join('');
    },
    
    renderActiveRideCard(booking) {
        const statusLabels = {
            'accepted': 'Awaiting Payment',
            'paid': 'Ready to Start',
            'on_way': 'On The Way',
            'arriving': 'Arriving Soon',
            'arrived': 'Arrived',
            'in_progress': 'In Progress'
        };
        
        return `
            <div class="booking-card active">
                <div class="booking-header">
                    <h3>${booking.passengerName}</h3>
                    <span class="booking-status ${booking.status}">${statusLabels[booking.status] || booking.status.toUpperCase()}</span>
                </div>
                <div class="vehicle-info">
                    <span><strong>Vehicle:</strong> ${booking.vehicleName}</span>
                    <span><strong>Route:</strong> ${booking.origin} → ${booking.destination}</span>
                    <span><strong>Time:</strong> ${booking.departureTime}</span>
                    <span><strong>Amount:</strong> R${booking.totalAmount.toFixed(2)}</span>
                </div>
                <div class="small">
                    Pickup: ${booking.pickupType === 'rank' ? '🚏 Taxi Rank' : `👍 ${booking.pickupAddress}`}
                    <br>Phone: ${booking.passengerPhone}
                </div>
                <div class="vehicle-actions">
                    ${booking.status === 'paid' || booking.status === 'on_way' || booking.status === 'arriving' || booking.status === 'arrived' || booking.status === 'in_progress' ? `
                        <button class="btn warning" onclick="DriverController.openStatusModal('${booking.id}')">📍 Update Status</button>
                    ` : ''}
                    <button class="btn info" onclick="DriverController.openChat('${booking.passengerId}')">💬 Message</button>
                </div>
            </div>
        `;
    },
    
    openStatusModal(bookingId) {
        this.currentStatusBookingId = bookingId;
        const booking = BookingManager.getById(bookingId);
        
        document.getElementById('statusBookingInfo').innerHTML = `
            <p><strong>Passenger:</strong> ${booking.passengerName}</p>
            <p><strong>Route:</strong> ${booking.origin} → ${booking.destination}</p>
            <p><strong>Current Status:</strong> ${booking.status}</p>
        `;
        
        document.getElementById('statusModal').classList.add('active');
    },
    
    updateRideStatus(newStatus) {
        if (!this.currentStatusBookingId) return;
        
        BookingManager.updateRideStatus(this.currentStatusBookingId, newStatus);
        
        document.getElementById('statusModal').classList.remove('active');
        
        this.loadActiveRides();
        
        if (newStatus === 'completed') {
            this.loadBookings();
            this.updateEarnings();
        }
        
        RealTimeUpdates.check();
    },
    
    loadVehicles() {
        const container = document.getElementById('myVehicles');
        if (!container) return;
        
        const vehicles = VehicleManager.getByDriver(Auth.currentUser.id);
        
        if (vehicles.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No vehicles added yet.</p></div>';
            return;
        }
        
        container.innerHTML = vehicles.map(v => this.renderVehicleCard(v)).join('');
    },
    
    renderVehicleCard(vehicle) {
        return `
            <div class="vehicle-card">
                <h3>${vehicle.name}</h3>
                <div class="vehicle-info">
                    <span><strong>From:</strong> ${vehicle.origin}</span>
                    <span><strong>To:</strong> ${vehicle.destination}</span>
                    <span><strong>Seats:</strong> ${vehicle.totalSeats}</span>
                    <span><strong>Price:</strong> R${vehicle.pricePerSeat}/seat</span>
                </div>
                <div class="vehicle-times">
                    ${vehicle.departureTimes.map(t => `<span class="time-badge">${t}</span>`).join('')}
                </div>
                <div class="vehicle-actions">
                    <button class="btn danger" onclick="DriverController.deleteVehicle('${vehicle.id}')">Remove</button>
                </div>
            </div>
        `;
    },
    
    deleteVehicle(vehicleId) {
        if (confirm('Are you sure you want to remove this vehicle?')) {
            VehicleManager.delete(vehicleId);
            this.loadVehicles();
        }
    },
    
    loadBookings() {
        const container = document.getElementById('driverBookings');
        if (!container) return;
        
        const bookings = BookingManager.getByDriver(Auth.currentUser.id);
        const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
        
        if (completedBookings.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No completed bookings yet.</p></div>';
            return;
        }
        
        container.innerHTML = completedBookings.map(b => this.renderBookingCard(b)).join('');
    },
    
    renderBookingCard(booking) {
        return `
            <div class="booking-card ${booking.status}">
                <div class="booking-header">
                    <h3>${booking.vehicleName} - ${booking.departureTime}</h3>
                    <span class="booking-status ${booking.status}">${booking.status.toUpperCase()}</span>
                </div>
                <div class="vehicle-info">
                    <span><strong>Passenger:</strong> ${booking.passengerName}</span>
                    <span><strong>Seats:</strong> ${booking.seats}</span>
                    <span><strong>Route:</strong> ${booking.origin} → ${booking.destination}</span>
                    <span><strong>Amount:</strong> R${booking.totalAmount.toFixed(2)}</span>
                </div>
                <div class="small">Booking ID: ${booking.id} | ${new Date(booking.createdAt).toLocaleDateString()}</div>
            </div>
        `;
    },
    
    updateEarnings() {
        const bookings = BookingManager.getByDriver(Auth.currentUser.id);
        const paidBookings = bookings.filter(b => ['paid', 'on_way', 'arriving', 'arrived', 'in_progress', 'completed'].includes(b.status));
        
        const today = new Date().toDateString();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const todayEarnings = paidBookings
            .filter(b => new Date(b.createdAt).toDateString() === today)
            .reduce((sum, b) => sum + b.totalAmount, 0);
        
        const weekEarnings = paidBookings
            .filter(b => new Date(b.createdAt) >= weekAgo)
            .reduce((sum, b) => sum + b.totalAmount, 0);
        
        const totalEarnings = paidBookings.reduce((sum, b) => sum + b.totalAmount, 0);
        
        const todayEl = document.getElementById('earningsToday');
        const weekEl = document.getElementById('earningsWeek');
        const totalEl = document.getElementById('earningsTotal');
        
        if (todayEl) todayEl.textContent = `R${todayEarnings.toFixed(2)}`;
        if (weekEl) weekEl.textContent = `R${weekEarnings.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `R${totalEarnings.toFixed(2)}`;
    },
    
    toggleNotifications() {
        const panel = document.getElementById('notifPanel');
        if (panel.style.display === 'none') {
            this.loadNotifications();
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    },
    
    loadNotifications() {
        const list = document.getElementById('notifList');
        if (!list) return;
        
        const notifications = NotificationManager.getForUser(Auth.currentUser.id);
        
        if (notifications.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
            return;
        }
        
        list.innerHTML = notifications.slice(0, 20).map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="DriverController.handleNotification('${n.id}')">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${this.formatTime(n.timestamp)}</div>
            </div>
        `).join('');
    },
    
    handleNotification(notifId) {
        NotificationManager.markAsRead(notifId);
        this.loadNotifications();
        RealTimeUpdates.check();
        this.loadPendingRequests();
        this.loadActiveRides();
    },
    
    openMessagesModal() {
        const modal = document.getElementById('messagesModal');
        const chatList = document.getElementById('chatList');
        
        const chats = MessagingManager.getChats(Auth.currentUser.id);
        
        if (chats.length === 0) {
            chatList.innerHTML = '<div class="empty-state"><p>No conversations yet</p></div>';
        } else {
            chatList.innerHTML = chats.map(chat => `
                <div class="chat-item" onclick="DriverController.openChat('${chat.userId}')">
                    <div class="chat-avatar">${chat.name.charAt(0).toUpperCase()}</div>
                    <div class="chat-info">
                        <div class="chat-name">${chat.name}</div>
                        <div class="chat-preview">${chat.lastMessage ? chat.lastMessage.content : 'No messages yet'}</div>
                    </div>
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
            `).join('');
        }
        
        modal.classList.add('active');
    },
    
    openChat(userId) {
        this.currentChatUserId = userId;
        const user = Auth.getUser(userId);
        
        document.getElementById('messagesModal').classList.remove('active');
        document.getElementById('chatWith').textContent = user ? user.name : 'User';
        
        MessagingManager.markAsRead(userId);
        this.loadChatMessages(userId);
        
        document.getElementById('chatModal').classList.add('active');
    },
    
    loadChatMessages(userId) {
        const container = document.getElementById('chatMessages');
        const messages = MessagingManager.getConversation(Auth.currentUser.id, userId);
        
        container.innerHTML = messages.map(m => `
            <div class="message ${m.fromUserId === Auth.currentUser.id ? 'sent' : 'received'}">
                <div class="message-bubble">${m.content}</div>
                <div class="message-time">${this.formatTime(m.timestamp)}</div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    },
    
    sendChatMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentChatUserId) return;
        
        MessagingManager.sendMessage(this.currentChatUserId, content);
        input.value = '';
        
        this.loadChatMessages(this.currentChatUserId);
    },
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
};

// Payment Page Controller
const PaymentController = {
    booking: null,
    
    init() {
        this.booking = Store.get('pendingBooking');
        
        if (!this.booking) {
            window.location.href = 'passenger.html';
            return;
        }
        
        this.loadBookingDetails();
        this.setupEventListeners();
        this.generateEFTReference();
    },
    
    loadBookingDetails() {
        document.getElementById('payTaxi').textContent = this.booking.vehicleName;
        document.getElementById('payRoute').textContent = `${this.booking.origin} → ${this.booking.destination}`;
        document.getElementById('payPickup').textContent = this.booking.pickupType === 'rank' ? '🚏 Taxi Rank' : `👍 ${this.booking.pickupAddress}`;
        document.getElementById('payTime').textContent = this.booking.departureTime;
        document.getElementById('paySeats').textContent = this.booking.seats;
        document.getElementById('payPrice').textContent = `R${this.booking.pricePerSeat}`;
        document.getElementById('payTotal').textContent = `R${this.booking.totalAmount.toFixed(2)}`;
    },
    
    setupEventListeners() {
        const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
        const payBtn = document.getElementById('payNowBtn');
        const downloadBtn = document.getElementById('downloadReceipt');
        
        paymentMethods.forEach(radio => {
            radio.addEventListener('change', () => this.switchPaymentMethod(radio.value));
        });
        
        if (payBtn) {
            payBtn.addEventListener('click', () => this.processPayment());
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadReceipt());
        }
        
        const cardNumber = document.getElementById('cardNumber');
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formatted;
            });
        }
        
        const cardExpiry = document.getElementById('cardExpiry');
        if (cardExpiry) {
            cardExpiry.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2);
                }
                e.target.value = value;
            });
        }
    },
    
    switchPaymentMethod(method) {
        document.getElementById('cardForm').style.display = method === 'card' ? 'block' : 'none';
        document.getElementById('eftForm').style.display = method === 'eft' ? 'block' : 'none';
        document.getElementById('walletForm').style.display = method === 'wallet' ? 'block' : 'none';
    },
    
    generateEFTReference() {
        const refEl = document.getElementById('eftRef');
        if (refEl) {
            refEl.textContent = this.booking.id;
        }
    },
    
    async processPayment() {
        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        const hint = document.getElementById('payHint');
        const overlay = document.getElementById('processingOverlay');
        const sendEmail = document.getElementById('sendEmailReceipt').checked;
        
        if (method === 'card') {
            const cardNumber = document.getElementById('cardNumber').value;
            const expiry = document.getElementById('cardExpiry').value;
            const cvv = document.getElementById('cardCVV').value;
            const name = document.getElementById('cardName').value;
            
            if (!cardNumber || !expiry || !cvv || !name) {
                hint.textContent = 'Please fill in all card details';
                return;
            }
        } else if (method === 'wallet') {
            const phone = document.getElementById('walletNumber').value;
            if (!phone) {
                hint.textContent = 'Please enter your mobile number';
                return;
            }
        }
        
        overlay.classList.add('active');
        hint.textContent = '';
        
        try {
            const paymentData = {
                bookingId: this.booking.id,
                amount: this.booking.totalAmount,
                method: method,
                cardNumber: method === 'card' ? document.getElementById('cardNumber').value : null,
                expiry: method === 'card' ? document.getElementById('cardExpiry').value : null,
                cvv: method === 'card' ? document.getElementById('cardCVV').value : null
            };
            
            const transaction = await PaymentGateway.processPayment(paymentData);
            
            overlay.classList.remove('active');
            
            // Send email notification if requested
            if (sendEmail) {
                const updatedBooking = BookingManager.getById(this.booking.id);
                EmailService.send(updatedBooking.passengerEmail, 'booking_confirmation', updatedBooking);
            }
            
            // Notify driver
            NotificationManager.create({
                userId: this.booking.driverId,
                type: 'payment_received',
                title: 'Payment Received',
                message: `${this.booking.passengerName} has paid R${this.booking.totalAmount.toFixed(2)} for booking ${this.booking.id}`,
                bookingId: this.booking.id
            });
            
            Store.remove('pendingBooking');
            
            this.showReceipt(transaction, sendEmail);
            
        } catch (error) {
            overlay.classList.remove('active');
            hint.textContent = error.message;
        }
    },
    
    showReceipt(transaction, emailSent) {
        document.querySelector('.payment-layout').style.display = 'none';
        
        const receiptCard = document.getElementById('receiptCard');
        const transactionId = document.getElementById('transactionId');
        const receiptDetails = document.getElementById('receiptDetails');
        
        transactionId.textContent = transaction.id;
        
        receiptDetails.innerHTML = `
            <p><strong>Booking ID:</strong> ${this.booking.id}</p>
            <p><strong>Taxi:</strong> ${this.booking.vehicleName}</p>
            <p><strong>Route:</strong> ${this.booking.origin} → ${this.booking.destination}</p>
            <p><strong>Departure:</strong> ${this.booking.departureTime}</p>
            <p><strong>Pickup:</strong> ${this.booking.pickupType === 'rank' ? 'Taxi Rank' : this.booking.pickupAddress}</p>
            <p><strong>Seats:</strong> ${this.booking.seats}</p>
            <p><strong>Amount Paid:</strong> R${this.booking.totalAmount.toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${transaction.method.toUpperCase()}</p>
            <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
            <p><strong>Reference:</strong> ${transaction.reference}</p>
        `;
        
        if (emailSent) {
            document.getElementById('emailSentNotice').style.display = 'block';
            document.getElementById('emailAddress').textContent = this.booking.passengerEmail;
        }
        
        receiptCard.style.display = 'block';
    },
    
    downloadReceipt() {
        const receiptContent = document.getElementById('receiptDetails').innerText;
        const transactionId = document.getElementById('transactionId').textContent;
        
        const text = `
RANKGO TAXI - PAYMENT RECEIPT
==============================
Transaction ID: ${transactionId}

${receiptContent}

Thank you for using RankGo Taxi!
        `;
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${transactionId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// =============================================
// Page Router
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    
    switch (page) {
        case 'login':
            LoginController.init();
            break;
        case 'signup':
            SignupController.init();
            break;
        case 'passenger':
            PassengerController.init();
            break;
        case 'driver':
            DriverController.init();
            break;
        case 'pay':
            PaymentController.init();
            break;
    }
});
