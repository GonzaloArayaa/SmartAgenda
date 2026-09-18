<?php
/**
 * SmartAgenda Pro - CORS y configuración compartida
 * Incluir al inicio de cada archivo API
 */

// Headers CORS para permitir peticiones desde React (localhost:5173)
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Iniciar sesión
session_start();

// Función helper para respuestas JSON
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Función helper para obtener datos del body (JSON)
function getRequestBody() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

// Función para verificar autenticación
function requireAuth() {
    if (!isset($_SESSION['user'])) {
        jsonResponse(['error' => 'No autenticado'], 401);
    }
    return $_SESSION['user'];
}

// Función para verificar rol
function requireRole($roles) {
    $user = requireAuth();
    if (!in_array($user['rol'], (array)$roles)) {
        jsonResponse(['error' => 'No tiene permisos para esta acción'], 403);
    }
    return $user;
}

require_once __DIR__ . '/../config/database.php';
