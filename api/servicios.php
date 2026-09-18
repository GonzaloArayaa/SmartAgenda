<?php
/**
 * SmartAgenda Pro - API de Servicios
 * CRUD de servicios para profesionales
 */

require_once __DIR__ . '/cors.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet();
        break;
    case 'POST':
        handlePost();
        break;
    case 'PUT':
        handlePut();
        break;
    case 'DELETE':
        handleDelete();
        break;
    default:
        jsonResponse(['error' => 'Método no permitido'], 405);
}

function handleGet() {
    $db = getDB();
    $idProfesional = $_GET['idProfesional'] ?? null;
    $idServicio = $_GET['id'] ?? null;

    if ($idServicio) {
        $stmt = $db->prepare("
            SELECT s.*, p.nombreNegocio 
            FROM servicio s 
            JOIN profesional p ON s.idProfesional = p.idProfesional 
            WHERE s.idServicio = ?
        ");
        $stmt->execute([$idServicio]);
        $servicio = $stmt->fetch();
        if (!$servicio) jsonResponse(['error' => 'Servicio no encontrado'], 404);
        jsonResponse($servicio);
    }

    if ($idProfesional) {
        $stmt = $db->prepare("
            SELECT s.*, p.nombreNegocio 
            FROM servicio s 
            JOIN profesional p ON s.idProfesional = p.idProfesional 
            WHERE s.idProfesional = ? AND s.estado = 'activo'
            ORDER BY s.nombre
        ");
        $stmt->execute([$idProfesional]);
    } else {
        $stmt = $db->query("
            SELECT s.*, p.nombreNegocio 
            FROM servicio s 
            JOIN profesional p ON s.idProfesional = p.idProfesional 
            WHERE s.estado = 'activo'
            ORDER BY p.nombreNegocio, s.nombre
        ");
    }

    jsonResponse($stmt->fetchAll());
}

function handlePost() {
    $user = requireRole(['Profesional', 'Administrador']);
    $data = getRequestBody();
    $db = getDB();

    $nombre = trim($data['nombre'] ?? '');
    $descripcion = trim($data['descripcion'] ?? '');
    $duracionMin = intval($data['duracionMin'] ?? 0);
    $precio = floatval($data['precio'] ?? 0);
    $idProfesional = intval($data['idProfesional'] ?? $user['idProfesional'] ?? 0);

    if (empty($nombre) || $duracionMin <= 0 || $precio <= 0 || $idProfesional <= 0) {
        jsonResponse(['error' => 'Datos incompletos o inválidos'], 400);
    }

    // Verificar nombre duplicado para el mismo profesional
    $stmt = $db->prepare("SELECT idServicio FROM servicio WHERE nombre = ? AND idProfesional = ? AND estado = 'activo'");
    $stmt->execute([$nombre, $idProfesional]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Ya existe un servicio con ese nombre'], 409);
    }

    $stmt = $db->prepare("
        INSERT INTO servicio (nombre, descripcion, duracionMin, precio, idProfesional)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$nombre, $descripcion, $duracionMin, $precio, $idProfesional]);

    jsonResponse(['message' => 'Servicio creado exitosamente', 'id' => $db->lastInsertId()], 201);
}

function handlePut() {
    $user = requireRole(['Profesional', 'Administrador']);
    $data = getRequestBody();
    $db = getDB();

    $id = intval($data['idServicio'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'ID de servicio requerido'], 400);

    $fields = [];
    $values = [];

    if (isset($data['nombre'])) { $fields[] = 'nombre = ?'; $values[] = trim($data['nombre']); }
    if (isset($data['descripcion'])) { $fields[] = 'descripcion = ?'; $values[] = trim($data['descripcion']); }
    if (isset($data['duracionMin'])) { $fields[] = 'duracionMin = ?'; $values[] = intval($data['duracionMin']); }
    if (isset($data['precio'])) { $fields[] = 'precio = ?'; $values[] = floatval($data['precio']); }
    if (isset($data['estado'])) { $fields[] = 'estado = ?'; $values[] = $data['estado']; }

    if (empty($fields)) jsonResponse(['error' => 'No hay datos para actualizar'], 400);

    $values[] = $id;
    $stmt = $db->prepare("UPDATE servicio SET " . implode(', ', $fields) . " WHERE idServicio = ?");
    $stmt->execute($values);

    jsonResponse(['message' => 'Servicio actualizado correctamente']);
}

function handleDelete() {
    $user = requireRole(['Profesional', 'Administrador']);
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'ID de servicio requerido'], 400);

    $db = getDB();

    // Verificar turnos pendientes
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM turno WHERE idServicio = ? AND estado IN ('pendiente', 'confirmado')");
    $stmt->execute([$id]);
    $result = $stmt->fetch();
    if ($result['total'] > 0) {
        jsonResponse(['error' => 'No se puede eliminar: hay turnos pendientes asociados'], 409);
    }

    // Baja lógica
    $stmt = $db->prepare("UPDATE servicio SET estado = 'inactivo' WHERE idServicio = ?");
    $stmt->execute([$id]);

    jsonResponse(['message' => 'Servicio eliminado correctamente']);
}
