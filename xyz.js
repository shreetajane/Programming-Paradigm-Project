import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, set, push, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyDu4OTBKEZu2pcEY7aJFO1YUME2IL5667A",
    authDomain: "lostandfoundportal-926c2.firebaseapp.com",
    databaseURL: "https://lostandfoundportal-926c2-default-rtdb.firebaseio.com",
    projectId: "lostandfoundportal-926c2",
    storageBucket: "lostandfoundportal-926c2.firebasestorage.app",
    messagingSenderId: "895099674015",
    appId: "1:895099674015:web:a1a25df7ac8b0472c031aa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dp0bhyhh3/image/upload';
const UPLOAD_PRESET = 'lostandfound'; 

let currentUser = null;

// Tab System
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const navBtn = (tabId === 'report-tab') ? 'nav-report' : 'nav-search';
    document.getElementById(navBtn).classList.add('active');
    if(tabId === 'search-tab') fetchLostItems();
};

// Auth Watcher
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const loginContainer = document.getElementById('login-container');
    const reportTab = document.getElementById('report-tab');
    
    if (user) {
        loginContainer.classList.add('hidden');
        reportTab.classList.add('active');
        document.getElementById('user-display').innerText = user.email;
        fetchLostItems();
    } else {
        loginContainer.classList.remove('hidden');
        reportTab.classList.remove('active');
        document.getElementById('user-display').innerText = "Not Signed In";
    }
});

// Login Handler
document.getElementById('signin-button').onclick = () => {
    const e = document.getElementById('email-input').value;
    const p = document.getElementById('password-input').value;
    if(!e || !p) return alert("Please enter credentials");
    signInWithEmailAndPassword(auth, e, p).catch(err => alert(err.message));
};

document.getElementById('signout-button').onclick = () => signOut(auth).then(() => window.location.reload());

// Image Labeling
document.getElementById('item-image-input').onchange = (e) => {
    if(e.target.files[0]) document.getElementById('file-chosen').innerText = e.target.files[0].name;
};

// Add Item
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
        if(!res.ok) throw new Error("Upload Failed. Check Cloudinary Preset.");
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
        alert(e.message); 
        btn.innerText = "POST TO REGISTRY"; 
        btn.disabled = false; 
    }
};

// Registry Actions
window.markClaimed = async (id) => {
    const cName = prompt("Enter Claimer's Name:");
    const cEmail = prompt("Enter Claimer's Email:");
    if(!cName || !cEmail) return;

    await update(ref(database, `lostItems/${id}`), {
        isClaimed: true,
        claimerName: cName,
        claimerEmail: cEmail
    });
};

window.deleteMe = (id) => confirm("Remove this entry permanently?") && remove(ref(database, `lostItems/${id}`));

// Fetch & Filter Logic
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

        items.sort((a, b) => b.timestamp - a.timestamp);

        items.forEach(item => {
            const isOwner = item.reportedBy === currentUser?.uid;
            const card = document.createElement('li');
            card.className = `glass-panel rounded-[2.5rem] overflow-hidden flex flex-col group transition-all duration-300 ${item.isClaimed ? 'opacity-30 grayscale' : 'hover:shadow-2xl hover:-translate-y-1'}`;
            
            // Image fallback to prevent 404 console errors
            const imgPath = item.imageUrl || 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=500&auto=format&fit=crop';

            let actionHtml = "";
            if (isOwner) {
                actionHtml = item.isClaimed 
                    ? `<div class="p-4 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-xl border border-emerald-500/20 font-bold uppercase tracking-widest mt-4">Resolved to: ${item.claimerName}</div>`
                    : `<div class="flex gap-2 mt-4">
                        <button onclick="markClaimed('${item.id}')" class="flex-1 bg-white text-slate-900 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-400 hover:text-white transition-all">Mark Claimed</button>
                        <button onclick="deleteMe('${item.id}')" class="bg-red-500/10 text-red-400 px-4 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                       </div>`;
            } else {
                actionHtml = item.isClaimed 
                    ? `<div class="p-4 bg-white/5 text-slate-500 text-[10px] rounded-xl text-center uppercase font-bold mt-4 tracking-widest">Handed Over</div>`
                    : `<a href="mailto:${item.reporterEmail}?subject=Found Item: ${item.name}" class="mt-4 block text-center text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Contact Owner →</a>`;
            }

            card.innerHTML = `
                <div class="h-52 overflow-hidden bg-slate-900 relative">
                    <img src="${imgPath}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                         onerror="this.src='https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=500&auto=format&fit=crop'">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60"></div>
                </div>
                <div class="p-8 flex-1 flex flex-col">
                    <div class="mb-4">
                        <h3 class="text-xl font-black text-white uppercase tracking-tight">${item.name}</h3>
                        <p class="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-1">📍 Found at: ${item.location}</p>
                    </div>
                    <p class="text-slate-500 text-xs italic leading-relaxed mb-6 line-clamp-2">"${item.description || 'No description provided.'}"</p>
                    <div class="mt-auto">${actionHtml}</div>
                </div>
            `;
            list.appendChild(card);
        });
    });
}