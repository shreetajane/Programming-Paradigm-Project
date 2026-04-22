// 1. Imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, set, push, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// 2. Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGpEqvw8-1RXrE8azXcpDsNOByMr6O11I",
    authDomain: "lostandfound-c64ca.firebaseapp.com",
    databaseURL: "https://lostandfound-c64ca-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lostandfound-c64ca",
    storageBucket: "lostandfound-c64ca.firebasestorage.app",
    messagingSenderId: "834912620022",
    appId: "1:834912620022:web:cac96dba77a97df73ecbd7",
    measurementId: "G-D0312STPS0"
};

// 3. Initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dp0bhyhh3/image/upload';
const UPLOAD_PRESET = 'lostandfound'; 

let currentUser = null;

// 4. Tab System (Attached to window so HTML can see it)
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const navBtn = (tabId === 'report-tab') ? 'nav-report' : 'nav-search';
    const btnElem = document.getElementById(navBtn);
    if(btnElem) btnElem.classList.add('active');
    if(tabId === 'search-tab') fetchLostItems();
};

// 5. Auth Watcher
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const loginContainer = document.getElementById('login-container');
    const reportTab = document.getElementById('report-tab');
    
    if (user) {
        console.log("✅ User logged in:", user.email);
        loginContainer.classList.add('hidden');
        window.switchTab('report-tab');
        document.getElementById('user-display').innerText = user.email;
        fetchLostItems();
    } else {
        console.log("👤 No user detected.");
        loginContainer.classList.remove('hidden');
        document.getElementById('report-tab').classList.remove('active');
        document.getElementById('user-display').innerText = "Not Signed In";
    }
});

// 6. Login Handler
const signinBtn = document.getElementById('signin-button');
if(signinBtn) {
    signinBtn.onclick = async () => {
        const e = document.getElementById('email-input').value;
        const p = document.getElementById('password-input').value;
        
        if(!e || !p) return alert("Please enter credentials");
        
        console.log("Attempting login for:", e);
        try {
            await signInWithEmailAndPassword(auth, e, p);
            console.log("Login successful!");
        } catch (err) {
            console.error("Login Error Details:", err.code, err.message);
            alert("Login Failed: " + err.message);
        }
    };
}

document.getElementById('signout-button').onclick = () => signOut(auth).then(() => window.location.reload());

// 7. Add Item Logic
document.getElementById('item-image-input').onchange = (e) => {
    if(e.target.files[0]) document.getElementById('file-chosen').innerText = e.target.files[0].name;
};

document.getElementById('add-item-button').onclick = async () => {
    const name = document.getElementById('item-name-input').value;
    const loc = document.getElementById('item-location-input').value;
    const desc = document.getElementById('item-description-input').value;
    const file = document.getElementById('item-image-input').files[0];

    if(!name || !file) return alert("Item Name and Image are required.");
    
    const btn = document.getElementById('add-item-button');
    btn.innerText = "UPLOADING...";
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();

        await set(push(ref(database, 'lostItems')), {
            name: name.toLowerCase(),
            location: loc,
            description: desc,
            imageUrl: data.secure_url,
            reportedBy: currentUser.uid,
            reporterEmail: currentUser.email,
            isClaimed: false,
            timestamp: Date.now()
        });
        
        alert("Published Successfully!");
        window.location.reload();
    } catch (e) { 
        alert("Upload failed: " + e.message); 
        btn.innerText = "POST TO REGISTRY"; 
        btn.disabled = false; 
    }
};

// 8. Registry Logic
window.markClaimed = async (id) => {
    const cName = prompt("Enter Claimer's Name:");
    const cEmail = prompt("Enter Claimer's Email:");
    if(!cName || !cEmail) return;
    await update(ref(database, `lostItems/${id}`), { isClaimed: true, claimerName: cName, claimerEmail: cEmail });
};

window.deleteMe = (id) => confirm("Remove this entry permanently?") && remove(ref(database, `lostItems/${id}`));

window.fetchLostItems = (searchTerm = '') => {
    const list = document.querySelector('#lost-items-display ul');
    onValue(ref(database, 'lostItems'), (snap) => {
        list.innerHTML = '';
        if (!snap.exists()) {
            list.innerHTML = '<p class="text-slate-500 col-span-full text-center py-10 italic">Registry is currently empty.</p>';
            return;
        }

        let items = [];
        snap.forEach(child => {
            const data = child.val();
            if(!searchTerm || data.name.includes(searchTerm.toLowerCase())) {
                items.push({ id: child.key, ...data });
            }
        });

        items.sort((a, b) => b.timestamp - a.timestamp).forEach(item => {
            const isOwner = item.reportedBy === currentUser?.uid;
            const card = document.createElement('li');
            card.className = `glass-panel rounded-[2.5rem] overflow-hidden flex flex-col group transition-all duration-300 ${item.isClaimed ? 'opacity-30 grayscale' : 'hover:shadow-2xl hover:-translate-y-1'}`;
            
            const imgPath = item.imageUrl || 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=500&auto=format&fit=crop';
            let actionHtml = isOwner 
                ? (item.isClaimed ? `<div class="p-4 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-xl font-bold mt-4">Resolved to: ${item.claimerName}</div>` 
                                  : `<div class="flex gap-2 mt-4"><button onclick="markClaimed('${item.id}')" class="flex-1 bg-white text-slate-900 py-3 rounded-xl text-[10px] font-black uppercase">Mark Claimed</button><button onclick="deleteMe('${item.id}')" class="bg-red-500/10 text-red-400 px-4 rounded-xl">🗑️</button></div>`)
                : (item.isClaimed ? `<div class="p-4 bg-white/5 text-slate-500 text-[10px] rounded-xl text-center mt-4">Handed Over</div>`
                                  : `<a href="mailto:${item.reporterEmail}?subject=Found Item: ${item.name}" class="mt-4 block text-center text-indigo-400 font-black text-[10px] uppercase">Contact Owner →</a>`);

            card.innerHTML = `
                <div class="h-52 overflow-hidden bg-slate-900 relative">
                    <img src="${imgPath}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60"></div>
                </div>
                <div class="p-8 flex-1 flex flex-col">
                    <h3 class="text-xl font-black text-white uppercase">${item.name}</h3>
                    <p class="text-indigo-400 text-[10px] font-bold mt-1">📍 ${item.location}</p>
                    <p class="text-slate-500 text-xs italic mt-4 mb-6 line-clamp-2">${item.description || ''}</p>
                    <div class="mt-auto">${actionHtml}</div>
                </div>`;
            list.appendChild(card);
        });
    });
};
