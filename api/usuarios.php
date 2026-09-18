<?php
/**
 * SmartAgenda Pro - API de Usuarios (Admin)
 * Gestión de usuarios del sistema
 */

require_once __DIR__ . '/cors.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET': handleGet(); break;
    case 'PUT': handlePut(); break;
    default: jsonResponse(['error' => 'Método no permitido'], 405);
}

function handleGet() {
    $user = requireRole(['Administrador']);
    $db = getDB();

    $stmt = $db->query("
        SELECT u.idUsuario, u.nombre, u.apellido, u.email, u.telefono, u.estado, 
               u.fechaRegistro, r.nombreRol as rol
        FROM usuario u
        JOIN rol r ON u.idRol = r.idRol
        ORDER BY u.fechaRegistro DESC
    ");

    jsonResponse($stmt->fetchAll());
}

function handlePut() {
    $user = requireRole(['Administrador']);
    $data = getRequestBody();
    $db = getDB();

    $id = intval($data['idUsuario'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'ID de usuario requerido'], 400);

    $fields = [];
    $values = [];

    if (isset($data['estado'])) { $fields[] = 'estado = ?'; $values[] = $data['estado']; }
    if (isset($data['idRol'])) { $fields[] = 'idRol = ?'; $values[] = intval($data['idRol']); }
    if (isset($data['nombre'])) { $fields[] = 'nombre = ?'; $values[] = trim($data['nombre']); }
    if (isset($data['apellido'])) { $fields[] = 'apellido = ?'; $values[] = trim($data['apellido']); }
    if (isset($data['telefono'])) { $fields[] = 'telefono = ?'; $values[] = trim($data['telefono']); }

    if (empty($fields)) jsonResponse(['error' => 'No hay datos para actualizar'], 400);

    $values[] = $id;
    $stmt = $db->prepare("UPDATE usuario SET " . implode(', ', $fields) . " WHERE idUsuario = ?");
    $stmt->execute($values);

    jsonResponse(['message' => 'Usuario actualizado correctamente']);
}
