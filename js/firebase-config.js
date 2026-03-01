// ═══════════════════════════════════════════════════════════════
//  CONFIGURAÇÃO DO FIREBASE
//  Siga o README.md para obter esses valores
//  Cole aqui as credenciais do seu projeto Firebase
// ═══════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAZQSprWAqNSlD9QGN0tWvM2Kl2YVxHqzY",
  authDomain:        "ff-squad-manager.firebaseapp.com",
  databaseURL:       "https://ff-squad-manager-default-rtdb.firebaseio.com",   // <- o mais importante: termina com .firebaseio.com
  projectId:         "ff-squad-manager",
  storageBucket:     "ff-squad-manager.firebasestorage.app",
  messagingSenderId: "567128938029",
  appId:             "1:567128938029:web:8480c809603289d9094aa4",
};

// Se databaseURL estiver como "COLE_AQUI", o app usa localStorage como fallback
// e mostra um aviso pedindo pra configurar o Firebase.
