<?php
/**
 * SmartAgenda Pro - API de Disponibilidad
 * Configurar horarios de atención por día
 */

require_once __DIR__ . '/cors.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET': handleGet(); break;
    case 'POST': handlePost(); break;
    case 'PUT': handlePut(); break;
    case 'DELETE': handleDelete(); break;
    default: jsonResponse(['error' => 'Método no permitido'], 405);
}

function handleGet() {
    $db = getDB();
    $idProfesional = $_GET['idProfesional'] ?? null;

    if (!$idProfesional) {
        jsonResponse(['error' => 'ID de profesional requerido'], 400);
    }

    $stmt = $db->prepare("
        SELECT * FROM disponibilidad 
        WHERE idProfesional = ? 
        ORDER BY FIELD(diaSemana, 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo')
    ");
    $stmt->execute([$idProfesional]);
    jsonResponse($stmt->fetchAll());
}

function handlePost() {
    $user = requireRole(['Profesional', 'Administrador']);
    $data = getRequestBody();
    $db = getDB();

    $diaSemana = trim($data['diaSemana'] ?? '');
    $horaInicio = $data['horaInicio'] ?? '';
    $horaFin = $data['horaFin'] ?? '';
    $intervaloMin = intval($data['intervaloMin'] ?? 30);
    $idProfesional = intval($data['idProfesional'] ?? $user['idProfesional'] ?? 0);

    if (empty($diaSemana) || empty($horaInicio) || empty($horaFin) || $idProfesional <= 0) {
        jsonResponse(['error' => 'Datos incompletos'], 400);
    }

    if ($horaFin <= $horaInicio) {
        jsonResponse(['error' => 'La hora de fin debe ser posterior a la de inicio'], 400);
    }

    // Verificar si ya existe configuración para ese día
    $stmt = $db->prepare("SELECT idDisponibilidad FROM disponibilidad WHERE idProfesional = ? AND diaSemana = ?");
    $stmt->execute([$idProfesional, $diaSemana]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Ya existe configuración para ese día. Use PUT para actualizar.'], 409);
    }

    $stmt = $db->prepare("
        INSERT INTO disponibilidad (diaSemana, horaInicio, horaFin, intervaloMin, idProfesional)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$diaSemana, $horaInicio, $horaFin, $intervaloMin, $idProfesional]);

    jsonResponse(['message' => 'Disponibilidad configurada', 'id' => $db->lastInsertId()], 201);
}

function handlePut() {
    $user = requireRole(['Profesional', 'Administrador']);
    $data = getRequestBody();
    $db = getDB();

    $id = intval($data['idDisponibilidad'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'ID requerido'], 400);

    $fields = [];
    $values = [];

    if (isset($data['horaInicio'])) { $fields[] = 'horaInicio = ?'; $values[] = $data['horaInicio']; }
    if (isset($data['horaFin'])) { $fields[] = 'horaFin = ?'; $values[] = $data['horaFin']; }
    if (isset($data['intervaloMin'])) { $fields[] = 'intervaloMin = ?'; $values[] = intval($data['intervaloMin']); }

    if (empty($fields)) jsonResponse(['error' => 'No hay datos para actualizar'], 400);

    $values[] = $id;
    $stmt = $db->prepare("UPDATE disponibilidad SET " . implode(', ', $fields) . " WHERE idDisponibilidad = ?");
    $stmt->execute($values);

    jsonResponse(['message' => 'Disponibilidad actualizada']);
}

function handleDelete() {
    $user = requireRole(['Profesional', 'Administrador']);
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'ID requerido'], 400);

    $db = getDB();
    $stmt = $db->prepare("DELETE FROM disponibilidad WHERE idDisponibilidad = ?");
    $stmt->execute([$id]);

    jsonResponse(['message' => 'Disponibilidad eliminada']);
}
