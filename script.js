// Add Firebase configuration at the top of the file
const firebaseConfig = {
    apiKey: "AIzaSyADbdw5KtrmjQT_5EBJ6kNzExx8kkTEkuc",
    authDomain: "realestate-694f3.firebaseapp.com",
    databaseURL: "https://realestate-694f3-default-rtdb.firebaseio.com",
    projectId: "realestate-694f3",
    storageBucket: "realestate-694f3.appspot.com",
    messagingSenderId: "966861149434",
    appId: "1:966861149434:web:8a57876a91c80bcf216543",
    measurementId: "G-J68SDN99DV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let callData = {
    details: []
};

// Update dashboard with data from Firebase
function updateDashboard() {
    database.ref('calls').orderByChild('timestamp').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            callData.details = Object.values(data);
            // Sort calls by timestamp in descending order
            callData.details.sort((a, b) => b.timestamp - a.timestamp);
            updateDashboardUI(callData);
            updateSummaryNumbers();
        }
    });
}

function updateDashboardUI(data) {
    document.getElementById('totalCallsSummary').textContent = data.details.length.toLocaleString();
    document.getElementById('interestedCallsSummary').textContent = data.details.filter(call => call.status === 'Interested').length.toLocaleString();
    document.getElementById('notInterestedCallsSummary').textContent = data.details.filter(call => call.status === 'Not Interested').length.toLocaleString();
    document.getElementById('unansweredCallsSummary').textContent = data.details.filter(call => call.status === 'Unanswered').length.toLocaleString();
    document.getElementById('callBackCallsSummary').textContent = data.details.filter(call => call.status === 'Callback').length.toLocaleString();

    const callDetailsBody = document.getElementById('callDetailsBody');
    callDetailsBody.innerHTML = '';
    
    // Sort calls by dateTime in descending order
    data.details.sort((a, b) => {
        const dateTimeA = new Date(a.dateTime.split(' ')[0].split('/').reverse().join('-') + 'T' + a.dateTime.split(' ')[1]);
        const dateTimeB = new Date(b.dateTime.split(' ')[0].split('/').reverse().join('-') + 'T' + b.dateTime.split(' ')[1]);
        return dateTimeB - dateTimeA;
    });

    data.details.forEach(call => {
        const row = document.createElement('tr');
        const formattedDateTime = formatDate(call.dateTime);
        const [date, time] = formattedDateTime.split(' ');
        const statusClass = getStatusClass(call.status);
        row.innerHTML = `
            <td>${call.number}</td>
            <td><span class="status-badge ${statusClass}">${call.status}</span></td>
            <td>${call.duration || 'N/A'}</td>
            <td>${date}</td>
            <td>${formatTime(time)}</td>
        `;
        callDetailsBody.appendChild(row);
    });
}

function getStatusClass(status) {
    switch (status) {
        case 'Interested':
            return 'status-interested';
        case 'Not Interested':
            return 'status-not-interested';
        case 'Unanswered':
            return 'status-unanswered';
        case 'Callback':
            return 'status-callback';
        default:
            return '';
    }
}

// Function to add a new call to the dashboard
function addCallToDashboard(call) {
    // Ensure the dateTime is in the correct format
    if (!call.dateTime) {
        const now = new Date();
        call.dateTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear().toString().slice(-2)} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    
    // Add a timestamp for sorting
    call.timestamp = firebase.database.ServerValue.TIMESTAMP;
    
    // Add the new call to Firebase
    const newCallRef = database.ref('calls').push();
    newCallRef.set(call)
        .then(() => {
            console.log('New call added successfully');
            updateDashboard();
        })
        .catch((error) => {
            console.error('Error adding new call:', error);
        });
}

// Function to format date to DD/MM/YY
function formatDate(dateString) {
    const [date, time] = dateString.split(' ');
    const [day, month, year] = date.split('/');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)} ${time}`;
}

// Function to update summary numbers
function updateSummaryNumbers() {
    const calls = callData.details || [];
    
    document.getElementById('totalCallsSummary').textContent = calls.length;
    document.getElementById('notInterestedCallsSummary').textContent = calls.filter(call => call.status === 'Not Interested').length;
    document.getElementById('unansweredCallsSummary').textContent = calls.filter(call => call.status === 'Unanswered').length;
    document.getElementById('callBackCallsSummary').textContent = calls.filter(call => call.status === 'Callback').length;
    document.getElementById('interestedCallsSummary').textContent = calls.filter(call => call.status === 'Interested').length;
}

// Load existing calls from Firebase
function loadExistingCalls() {
    updateDashboard();
}

// Clear data based on the current status
function clearAllData() {
    const currentStatus = document.querySelector('.call-details-card').dataset.currentStatus;
    let confirmMessage = "Are you sure you want to clear all data? This action cannot be undone.";
    
    if (currentStatus !== 'Total') {
        confirmMessage = `Are you sure you want to clear all ${currentStatus} calls? This action cannot be undone.`;
    }

    if (confirm(confirmMessage)) {
        if (currentStatus === 'Total') {
            database.ref('calls').remove()
                .then(() => {
                    console.log('All data has been cleared from Firebase');
                    updateDashboard();
                })
                .catch((error) => {
                    console.error('Error clearing data:', error);
                });
        } else {
            database.ref('calls').orderByChild('status').equalTo(currentStatus).once('value', snapshot => {
                const updates = {};
                snapshot.forEach(child => {
                    updates[child.key] = null;
                });
                database.ref('calls').update(updates)
                    .then(() => {
                        console.log(`All ${currentStatus} calls have been cleared from Firebase`);
                        updateDashboard();
                    })
                    .catch((error) => {
                        console.error('Error clearing data:', error);
                    });
            });
        }
    }
}

// Listen for messages from the dialpad
window.addEventListener('message', function(event) {
    console.log('Received message:', event.data);
    if (event.data.type === 'newCall') {
        console.log('Received new call:', event.data.call);
        updateDashboard(); // This will fetch the latest data from Firebase
    }
});

// Function to open dialpad
function openDialpad() {
    window.open('dialpad.html', 'dialpad', 'width=300,height=400');
}

// Function to open Today's dashboard in a new window
function openTodayDashboard() {
    const todayWindow = window.open('today_calls.html', '_blank', 'width=800,height=600');
    todayWindow.addEventListener('load', function() {
        fetchTodayCalls().then(todayCalls => {
            todayWindow.postMessage({ type: 'todayCallsData', calls: todayCalls }, '*');
        }).catch(error => {
            console.error("Error fetching today's calls:", error);
        });
    });
}

// Function to open Weekly Report in a new window
function openWeeklyReport() {
    window.open('weekly_report.html', '_blank', 'width=800,height=600');
}

// Function to open Monthly dashboard in a new window
function openMonthlyDashboard() {
    window.open('monthly_calls.html', '_blank', 'width=800,height=600');
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadExistingCalls();

    // Event listeners for buttons
    document.getElementById('todayBtn').addEventListener('click', openTodayDashboard);
    document.getElementById('weekReportBtn').addEventListener('click', openWeeklyReport);
    document.getElementById('monthlyBtn').addEventListener('click', openMonthlyDashboard);
    document.getElementById('settingsBtn').addEventListener('click', function() {
        alert('Settings clicked');
    });

    // Add this code for the dialpad trigger
    const dialpadTrigger = document.getElementById('dialpadTrigger');
    if (dialpadTrigger) {
        dialpadTrigger.addEventListener('click', openDialpad);
    } else {
        console.error("Dialpad trigger button not found");
    }

    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearAllData);
    } else {
        console.error("Clear Data button not found");
    }

    // Add event listeners for summary cards
    const totalCallsCard = document.getElementById('totalCallsCard');
    const notInterestedCard = document.querySelector('.summary-card.notinterestedcard');
    const unansweredCard = document.querySelector('.summary-card.unanswredcalls');
    const callBackCard = document.querySelector('.summary-card.callbackcard');
    const interestedCard = document.querySelector('.summary-card.interestedcard');
    const callDetailsCard = document.getElementById('callDetailsCard');

    totalCallsCard.addEventListener('click', () => toggleCallDetails('Total'));
    notInterestedCard.addEventListener('click', () => toggleCallDetails('Not Interested'));
    unansweredCard.addEventListener('click', () => toggleCallDetails('Unanswered'));
    callBackCard.addEventListener('click', () => toggleCallDetails('Callback'));
    interestedCard.addEventListener('click', () => toggleCallDetails('Interested'));

    function toggleCallDetails(status) {
        if (callDetailsCard.style.display === 'none' || callDetailsCard.dataset.currentStatus !== status) {
            showCallDetails(status);
        } else {
            callDetailsCard.style.display = 'none';
        }
    }

    function showCallDetails(status) {
        const callDetailsBody = document.getElementById('callDetailsBody');
        callDetailsBody.innerHTML = '';

        let filteredCalls = callData.details;
        if (status !== 'Total') {
            filteredCalls = callData.details.filter(call => call.status === status);
        }

        // Sort calls by dateTime in descending order
        filteredCalls.sort((a, b) => {
            const dateTimeA = new Date(a.dateTime.split(' ')[0].split('/').reverse().join('-') + 'T' + a.dateTime.split(' ')[1]);
            const dateTimeB = new Date(b.dateTime.split(' ')[0].split('/').reverse().join('-') + 'T' + b.dateTime.split(' ')[1]);
            return dateTimeB - dateTimeA;
        });

        filteredCalls.forEach(call => {
            const row = document.createElement('tr');
            const formattedDateTime = formatDate(call.dateTime);
            const [date, time] = formattedDateTime.split(' ');
            const statusClass = getStatusClass(call.status);
            
            let rowContent = `
                <td>${call.number}</td>
                <td><span class="status-badge ${statusClass}">${call.status}</span></td>
                <td>${call.duration || 'N/A'}</td>
                <td>${date}</td>
                <td>${formatTime(time)}</td>
            `;

            if (status === 'Callback' || status === 'Interested') {
                rowContent += `
                    <td>
                        <button onclick="window.openWhatsApp('${call.number}')" class="btn btn-sm btn-success">WhatsApp</button>
                        <a href="tel:+91${call.number}" class="btn btn-sm btn-primary">Call</a>
                    </td>
                `;
            }

            row.innerHTML = rowContent;
            callDetailsBody.appendChild(row);
        });

        callDetailsCard.style.display = 'block';
        callDetailsCard.dataset.currentStatus = status;
        document.querySelector('.call-details-card h2').textContent = `${status} Call Details`;

        // Update the table header to include or exclude the Actions column
        const tableHeader = document.querySelector('.call-details-table thead tr');
        if (status === 'Callback' || status === 'Interested') {
            if (!tableHeader.querySelector('th:last-child')) {
                const actionsHeader = document.createElement('th');
                actionsHeader.textContent = 'Actions';
                tableHeader.appendChild(actionsHeader);
            }
        } else {
            const lastHeader = tableHeader.querySelector('th:last-child');
            if (lastHeader && lastHeader.textContent === 'Actions') {
                tableHeader.removeChild(lastHeader);
            }
        }
    }

    // Move this function outside of any other functions
    window.openWhatsApp = function(number) {
        const formattedNumber = number.replace(/\D/g, '');
        const message = encodeURIComponent("Hello, I'm contacting you regarding our previous call.");
        const whatsappUrl = `https://wa.me/91${formattedNumber}?text=${message}`;
        
        // Try to open in a new window first
        const newWindow = window.open(whatsappUrl, '_blank');
        
        // If blocked by popup blocker, try to open in the same window
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
            window.location.href = whatsappUrl;
        }
    };

    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printCallDetails);
    } else {
        console.error("Print button not found");
    }
});

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = (hour % 12 || 12).toString();
    return `${formattedHour}:${minutes.slice(0, 2)}${ampm}`;
}

// Add this function to your script.js file
function printCallDetails() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Call Details Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                h1 {
                    text-align: center;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
                @page {
                    size: A4 landscape;
                    margin: 1cm;
                }
            </style>
        </head>
        <body>
            <h1>Call Details Report</h1>
            <table>
                <thead>
                    <tr>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Date</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${Array.from(document.querySelectorAll('#callDetailsBody tr')).map(row => row.outerHTML).join('')}
                </tbody>
            </table>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Add this to your existing script.js file

document.addEventListener('DOMContentLoaded', function() {
    const clearDataBtn = document.getElementById('clearDataBtn');
    const printBtn = document.getElementById('printBtn');

    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            // Add your clear data functionality here
            console.log('Clear data button clicked');
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', function() {
            // Add your print functionality here
            console.log('Print button clicked');
        });
    }
});

// Add this function to fetch today's calls
function fetchTodayCalls() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
    
    return database.ref('calls').orderByChild('timestamp').startAt(startOfDay).endAt(endOfDay).once('value')
        .then((snapshot) => {
            const todayCalls = [];
            snapshot.forEach((childSnapshot) => {
                todayCalls.push(childSnapshot.val());
            });
            console.log('Fetched today\'s calls:', todayCalls);
            return todayCalls;
        });
}
