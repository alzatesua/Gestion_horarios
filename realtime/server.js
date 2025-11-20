// server.js - Servidor WebSocket para control de asistencia en tiempo real
// Instalar dependencias: npm install ws express cors

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Almacenamiento en memoria de usuarios conectados
const connectedUsers = new Map(); // userId -> { ws, data }
const leaders = new Map();        // leaderId -> ws

// Manejador de conexiones WebSocket
wss.on('connection', (ws) => {
  console.log('Nueva conexión WebSocket establecida');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Mensaje recibido:', data);

      switch (data.type) {
        case 'identify':
          handleUserIdentification(ws, data);
          break;

        case 'identify_leader':
          handleLeaderIdentification(ws, data);
          break;

        case 'estado_cambio':
          handleEstadoCambio(data);
          break;

        case 'request_all_status':
          handleRequestAllStatus(ws);
          break;

        // 💓 keepalive desde el frontend
        case 'ping':
          handlePing(ws, data);
          break;

        default:
          console.log('Tipo de mensaje desconocido:', data.type);
      }
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
    }
  });


  ws.on('close', (code, reason) => {
    console.log('🔴 WS cerrado en servidor:', { code, reason: reason?.toString() });
    handleDisconnection(ws, code, reason);
  });


  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// 🔹 Identificar usuario trabajador
function handleUserIdentification(ws, data) {
  const userId = data.userId;
  
  connectedUsers.set(userId, {
    ws,
    userId: data.userId,
    nombre: data.nombre,
    cargo: data.cargo,
    area: data.area,
    estado: 'desconectado',
    lastUpdate: new Date().toISOString()
  });

  console.log(`Usuario ${data.nombre} conectado (${userId})`);

  // Notificar a todos los líderes que hay un nuevo usuario conectado
  notifyLeaders({
    type: 'user_connected',
    userId: data.userId,
    nombre: data.nombre,
    cargo: data.cargo,
    area: data.area
  });

  // Confirmar conexión al usuario
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Conexión establecida correctamente'
  }));
}

// 🔹 Identificar líder
function handleLeaderIdentification(ws, data) {
  const leaderId = data.userId;
  leaders.set(leaderId, ws);
  
  console.log(`Líder ${data.nombre} conectado (${leaderId})`);

  // Enviar confirmación
  ws.send(JSON.stringify({
    type: 'leader_connected',
    message: 'Conexión como líder establecida'
  }));
}

// 🔹 Manejar cambio de estado de usuario
function handleEstadoCambio(data) {
  const userId = data.userId;
  const user = connectedUsers.get(userId);

  if (user) {
    // Actualizar estado del usuario
    user.estado = data.estado;
    user.lastUpdate = data.timestamp || new Date().toISOString();

    console.log(`Estado de ${user.nombre} cambiado a: ${data.estado}`);

    // Notificar a todos los líderes del cambio de estado
    notifyLeaders({
      type: 'estado_cambio',
      userId: data.userId,
      nombre: data.nombre,
      cargo: data.cargo,
      area: data.area,
      estado: data.estado,
      timestamp: user.lastUpdate
    });

    // Aquí puedes guardar en la base de datos
    // saveEstadoToDatabase(userId, data.estado, data.timestamp);
  }
}

// 🔹 Solicitud de estado de todos los usuarios
function handleRequestAllStatus(ws) {
  const users = Array.from(connectedUsers.values()).map(user => ({
    userId: user.userId,
    nombre: user.nombre,
    cargo: user.cargo,
    area: user.area,
    estado: user.estado,
    lastUpdate: user.lastUpdate
  }));

  ws.send(JSON.stringify({
    type: 'all_status',
    users: users
  }));

  console.log(`Enviados ${users.length} usuarios al líder`);
}

// 💓 Nuevo: manejar ping del frontend
function handlePing(ws, data) {
  const userId = data.userId;
  const user = connectedUsers.get(userId);

  // Si conocemos al usuario, actualizamos su lastUpdate
  if (user) {
    user.lastUpdate = data.timestamp || new Date().toISOString();
  }

  // Responder con pong para mantener viva la conexión
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pong',
      serverTime: new Date().toISOString()
    }));
  }
}

// 🔹 Notificar a todos los líderes
function notifyLeaders(data) {
  leaders.forEach((leaderWs, leaderId) => {
    if (leaderWs.readyState === WebSocket.OPEN) {
      leaderWs.send(JSON.stringify(data));
    }
  });
}

// 🔹 Manejar desconexión
function handleDisconnection(ws) {
  // Buscar si es un usuario o líder
  let disconnectedUserId = null;

  // Verificar en usuarios
  for (const [userId, user] of connectedUsers.entries()) {
    if (user.ws === ws) {
      disconnectedUserId = userId;
      connectedUsers.delete(userId);
      console.log(`Usuario ${user.nombre} desconectado (${userId})`);
      
      // Notificar a líderes
      notifyLeaders({
        type: 'user_disconnected',
        userId: userId,
        nombre: user.nombre
      });
      break;
    }
  }

  // Verificar en líderes
  if (!disconnectedUserId) {
    for (const [leaderId, leaderWs] of leaders.entries()) {
      if (leaderWs === ws) {
        leaders.delete(leaderId);
        console.log(`Líder desconectado (${leaderId})`);
        break;
      }
    }
  }
}

// ======================= API REST opcional =======================

// Obtener usuarios conectados
app.get('/api/connected-users', (req, res) => {
  const users = Array.from(connectedUsers.values()).map(user => ({
    userId: user.userId,
    nombre: user.nombre,
    cargo: user.cargo,
    area: user.area,
    estado: user.estado,
    lastUpdate: user.lastUpdate
  }));
  res.json(users);
});

// Obtener estado de un usuario específico
app.get('/api/user-status/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = connectedUsers.get(userId);
  
  if (user) {
    res.json({
      userId: user.userId,
      nombre: user.nombre,
      estado: user.estado,
      lastUpdate: user.lastUpdate
    });
  } else {
    res.status(404).json({ error: 'Usuario no encontrado o no conectado' });
  }
});

// Forzar cambio de estado (para casos especiales)
app.post('/api/force-estado', (req, res) => {
  const { userId, estado } = req.body;
  const user = connectedUsers.get(userId);

  if (user) {
    user.estado = estado;
    user.lastUpdate = new Date().toISOString();

    // Notificar al usuario y a los líderes
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify({
        type: 'forced_estado_change',
        estado: estado
      }));
    }

    notifyLeaders({
      type: 'estado_cambio',
      userId: userId,
      nombre: user.nombre,
      estado: estado,
      timestamp: user.lastUpdate
    });

    res.json({ success: true, message: 'Estado actualizado' });
  } else {
    res.status(404).json({ error: 'Usuario no encontrado' });
  }
});

// Estadísticas en tiempo real
app.get('/api/statistics', (req, res) => {
  const total = connectedUsers.size;
  const estados = {
    disponible: 0,
    break: 0,
    almuerzo: 0,
    desconectado: 0
  };

  connectedUsers.forEach(user => {
    if (estados[user.estado] !== undefined) {
      estados[user.estado]++;
    }
  });

  res.json({
    total,
    estados,
    lideres: leaders.size
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    websocket: wss.clients.size,
    users: connectedUsers.size,
    leaders: leaders.size
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Servidor WebSocket iniciado en puerto ${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 API REST: http://localhost:${PORT}`);
});

// Limpieza periódica de conexiones inactivas
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutos

  connectedUsers.forEach((user, userId) => {
    const lastUpdate = new Date(user.lastUpdate).getTime();
    if (now - lastUpdate > timeout) {
      console.log(`Limpiando usuario inactivo: ${user.nombre}`);
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.close();
      }
      connectedUsers.delete(userId);
    }
  });
}, 60000); // Cada minuto

// Manejo de cierre del servidor
process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');
  wss.clients.forEach((ws) => {
    ws.close();
  });
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});
