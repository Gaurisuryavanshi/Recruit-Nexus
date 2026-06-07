const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const usersFile = path.join(__dirname, "users.json");

// Create uploads directory if it doesn't exist to prevent crashes
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

const getUsers = () => {
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
        return [];
    }
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
};

/* --- Routes --- */

// 1. REGISTER ROUTE (UPDATED FOR FETCH & N8N SUPPORT)
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        let users = getUsers(); 
        
        // Email match check karne
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: "Email already exists" });
        }
        
        // 🚀 बदल: फक्त आवश्यक डेटाच गोळा करून ऑब्जेक्ट तयार केला (phone, skills, experience काढून टाकले)
        const newUser = { 
            name, 
            email, 
            password, 
            role  // रोल सेव्ह करणे अनिवार्य केले
        };

        // Local JSON file madhe store karne
        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        // =============================================================
        // [OPTIONAL] TUMCHA N8N WEBHOOK URL ITHE TAKA:
        // =============================================================
        /*
        try {
            await fetch('TUMCHA_N8N_REGISTER_WEBHOOK_URL', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser) // नवीन सुटसुटीत ऑब्जेक्ट पाठवला
            });
        } catch (n8nErr) {
            console.error("n8n automation triggered but failed:", n8nErr);
        }
        */

        // Frontend la standard JSON response dene
        res.status(200).json({ message: "Registration successful!" });

    } catch (err) { 
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Registration Error on server side" }); 
    }
});

// 2. LOGIN ROUTE (SMART ROLE BASED APPROVAL)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    const usersList = getUsers(); 
    const user = usersList.find(u => u.email === email && u.password === password);
    
    if (user) {
        let dashboard = "";

        // 🚀 जर युझरचा मूळ रोल 'recruiter' असेल, पण तुम्ही त्याला अजून 'true' केले नसेल:
        if (user.role === "recruiter") {
            if (user.isApproved === true || user.isApproved === "true") {
                dashboard = "recruiter-dashboard.html";
            } else {
                // 💡 जर तुम्ही 'true' लिहायचे विसरलात किंवा काहीच लिहिले नसेल (undefined/false), 
                // तर सिस्टीम त्याला स्वतःहून 'jobseeker' डॅशबोर्डवर पाठवेल!
                dashboard = "jobseeker-dashboard.html";
                user.role = "jobseeker"; // त्याचा तात्पुरता रोल बदलला
            }
        } else {
            // जर आधीपासूनच रोल jobseeker असेल तर नॉर्मल लॉगिन
            dashboard = "jobseeker-dashboard.html";
        }

        res.status(200).json({ redirectUrl: dashboard, role: user.role });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// 3. GET CANDIDATE PROFILE DATA (NEW ROUTE FOR DASHBOARD)
app.get('/api/get-profile', (req, res) => {
    const { email } = req.query;
    const user = getUsers().find(u => u.email === email);
    
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

// Explicit route for the interview page
app.get('/interview', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'interview.html'));
});

// Jobseeker Dashboard साठी एक्सप्रेसचा स्पष्ट रूट
app.get('/jobseeker-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jobseeker-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
