<?php
/**
 * SmartAgenda Pro - API de Autenticación
 * Endpoints: login, register, logout, check
 * Uso: /api/auth.php?action=login|register|logout|check
 */

require_once __DIR__ . '/cors.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'login':
        if ($method !== 'POST') jsonResponse(['error' => 'Método no permitido'], 405);
        handleLogin();
        break;
    case 'register':
        if ($method !== 'POST') jsonResponse(['error' => 'Método no permitido'], 405);
        handleRegister();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        handleCheck();
        break;
    default:
        jsonResponse(['error' => 'Acción no válida'], 400);
}

function handleLogin() {
    $data = getRequestBody();
    $email = trim($data['email'] ?? '');
    $password = $data['contrasena'] ?? '';

    if (empty($email) || empty($password)) {
        jsonResponse(['error' => 'Email y contraseña son requeridos'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("
        SELECT u.idUsuario, u.nombre, u.apellido, u.email, u.contrasena, 
               u.telefono, u.estado, r.nombreRol as rol,
               p.idProfesional, p.nombreNegocio
        FROM usuario u
        JOIN rol r ON u.idRol = r.idRol
        LEFT JOIN profesional p ON p.idUsuario = u.idUsuario
        WHERE u.email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['error' => 'Credenciales incorrectas'], 401);
    }

    if ($user['estado'] !== 'activo') {
        jsonResponse(['error' => 'Cuenta deshabilitada. Contacte al administrador.'], 403);
    }

    if (!password_verify($password, $user['contrasena'])) {
        jsonResponse(['error' => 'Credenciales incorrectas'], 401);
    }

    // Guardar datos en sesión (sin la contraseña)
    unset($user['contrasena']);
    $_SESSION['user'] = $user;

    jsonResponse([
        'message' => 'Inicio de sesión exitoso',
        'user' => $user
    ]);
}

function handleRegister() {
    $data = getRequestBody();
    
    $nombre = trim($data['nombre'] ?? '');
    $apellido = trim($data['apellido'] ?? '');
    $email = trim($data['email'] ?? '');
    $telefono = trim($data['telefono'] ?? '');
    $password = $data['contrasena'] ?? '';
    $rolNombre = $data['rol'] ?? 'Cliente';

    // Validaciones
    if (empty($nombre) || empty($apellido) || empty($email) || empty($password)) {
        jsonResponse(['error' => 'Todos los campos obligatorios deben completarse'], 400);
    }

    if (strlen($password) < 6) {
        jsonResponse(['error' => 'La contraseña debe tener al menos 6 caracteres'], 400);
    }

    $db = getDB();

    // Verificar email duplicado
    $stmt = $db->prepare("SELECT idUsuario FROM usuario WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'El email ya está registrado'], 409);
    }

    // Obtener ID del rol
    $stmt = $db->prepare("SELECT idRol FROM rol WHERE nombreRol = ?");
    $stmt->execute([$rolNombre]);
    $rol = $stmt->fetch();
    if (!$rol) {
        jsonResponse(['error' => 'Rol no válido'], 400);
    }

    // Insertar usuario
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("
        INSERT INTO usuario (nombre, apellido, email, contrasena, telefono, idRol)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$nombre, $apellido, $email, $hash, $telefono, $rol['idRol']]);
    $userId = $db->lastInsertId();

    // Si es profesional, crear perfil profesional
    if ($rolNombre === 'Profesional') {
        $nombreNegocio = trim($data['nombreNegocio'] ?? $nombre . ' - Profesional');
        $descripcion = trim($data['descripcion'] ?? '');
        $idRubro = intval($data['idRubro'] ?? 1);

        $stmt = $db->prepare("
            INSERT INTO profesional (nombreNegocio, descripcion, idRubro, idUsuario)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$nombreNegocio, $descripcion, $idRubro, $userId]);
    }

    jsonResponse(['message' => 'Registro exitoso', 'idUsuario' => $userId], 201);
}

function handleLogout() {
    session_destroy();
    jsonResponse(['message' => 'Sesión cerrada correctamente']);
}

function handleCheck() {
    if (isset($_SESSION['user'])) {
        jsonResponse(['authenticated' => true, 'user' => $_SESSION['user']]);
    } else {
        jsonResponse(['authenticated' => false], 200);
    }
}
