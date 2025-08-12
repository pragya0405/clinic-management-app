const http = require('http');
const url = require('url');

const doctors = [
  { id: 1, name: 'Dr. Smith', specialty: 'Cardiology' },
  { id: 2, name: 'Dr. Johnson', specialty: 'Dermatology' },
  { id: 3, name: 'Dr. Patel', specialty: 'Pediatrics' }
];

let patients = [];
let appointments = [];

// Helper: Send JSON response with CORS headers
const sendJSON = (res, data, statusCode = 200) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  /** -----------------
   *   DOCTORS APIs
   *  ----------------- */
  if (req.method === 'GET' && parsedUrl.pathname === '/doctors') {
    return sendJSON(res, doctors);
  }

  /** -----------------
   *   PATIENTS APIs
   *  ----------------- */

  // GET /patients
  if (req.method === 'GET' && parsedUrl.pathname === '/patients') {
    return sendJSON(res, patients);
  }

  // POST /patients  (add new patient)
  if (req.method === 'POST' && parsedUrl.pathname === '/patients') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.name || !data.phone) {
          return sendJSON(res, { error: 'Name and phone are required' }, 400);
        }
        const newPatient = {
          id: patients.length ? patients[patients.length - 1].id + 1 : 1,
          name: data.name,
          phone: data.phone
        };
        patients.push(newPatient);
        sendJSON(res, newPatient, 201);
      } catch {
        sendJSON(res, { error: 'Invalid patient data' }, 400);
      }
    });
    return;
  }

  // PUT /patients/:id (edit patient)
  if (req.method === 'PUT' && /^\/patients\/\d+$/.test(parsedUrl.pathname)) {
    const id = parseInt(parsedUrl.pathname.split('/')[2]);
    const pt = patients.find(p => p.id === id);
    if (!pt) return sendJSON(res, { error: 'Patient not found' }, 404);

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.name || !data.phone) {
          return sendJSON(res, { error: 'Name and phone are required' }, 400);
        }
        pt.name = data.name;
        pt.phone = data.phone;
        sendJSON(res, pt);
      } catch {
        sendJSON(res, { error: 'Invalid patient data' }, 400);
      }
    });
    return;
  }

  // DELETE /patients/:id (delete patient & their appointments)
  if (req.method === 'DELETE' && /^\/patients\/\d+$/.test(parsedUrl.pathname)) {
    const id = parseInt(parsedUrl.pathname.split('/')[2]);
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) return sendJSON(res, { error: 'Patient not found' }, 404);

    patients.splice(index, 1);
    appointments = appointments.filter(a => a.patientId !== id);
    return sendJSON(res, { success: true });
  }

  /** -----------------
   *   APPOINTMENTS APIs
   *  ----------------- */

  // GET /appointments
  if (req.method === 'GET' && parsedUrl.pathname === '/appointments') {
    return sendJSON(res, appointments);
  }

  // POST /appointments (book new appointment)
  if (req.method === 'POST' && parsedUrl.pathname === '/appointments') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.patientId || !data.doctorId || !data.date) {
          return sendJSON(
            res,
            { error: 'patientId, doctorId, and date are required' },
            400
          );
        }

        // Validate references
        const patient = patients.find(p => p.id === data.patientId);
        const doctor = doctors.find(d => d.id === data.doctorId);
        if (!patient || !doctor) {
          return sendJSON(res, { error: 'Invalid patientId or doctorId' }, 400);
        }

        // Prevent same patient/doctor at same time
        const conflict = appointments.some(
          a =>
            (a.doctorId === data.doctorId && a.date === data.date) ||
            (a.patientId === data.patientId && a.date === data.date)
        );
        if (conflict) {
          return sendJSON(
            res,
            { error: 'Conflict: doctor or patient already booked at that time' },
            400
          );
        }

        const newAppointment = {
          id: appointments.length
            ? appointments[appointments.length - 1].id + 1
            : 1,
          patientId: data.patientId,
          patientName: patient.name,
          doctorId: data.doctorId,
          doctorName: doctor.name,
          date: data.date
        };
        appointments.push(newAppointment);
        sendJSON(res, newAppointment, 201);
      } catch {
        sendJSON(res, { error: 'Invalid appointment data' }, 400);
      }
    });
    return;
  }

  // DELETE /appointments/:id
  if (req.method === 'DELETE' && /^\/appointments\/\d+$/.test(parsedUrl.pathname)) {
    const id = parseInt(parsedUrl.pathname.split('/')[2]);
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return sendJSON(res, { error: 'Appointment not found' }, 404);

    appointments.splice(index, 1);
    return sendJSON(res, { success: true });
  }

  /** -----------------
   *   DEFAULT HANDLER
   *  ----------------- */
  sendJSON(res, { error: 'Not Found' }, 404);
});

server.listen(3000, () => {
  console.log('🚀 Clinic Backend Server is running!');
  console.log('🌐 Doctors API:       http://localhost:3000/doctors');
  console.log('🌐 Patients API:      http://localhost:3000/patients');
  console.log('🌐 Appointments API:  http://localhost:3000/appointments');
});
