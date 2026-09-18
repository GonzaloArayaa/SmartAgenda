<?php
/**
 * SmartAgenda Pro - API de Profesionales
 * Búsqueda, perfil y gestión de profesionales
 */

require_once __DIR__ . '/cors.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET': handleGet(); break;
    case 'POST': handlePost(); break;
    case 'PUT': handlePut(); break;
    default: jsonResponse(['error' => 'Método no permitido'], 405);
}

function handleGet() {
    $db = getDB();
    $id = $_GET['id'] ?? null;
    $buscar = $_GET['buscar'] ?? null;
    $idRubro = $_GET['idRubro'] ?? null;
    $idUsuario = $_GET['idUsuario'] ?? null;

    if ($id) {
        $stmt = $db->prepare("
            SELECT p.*, r.nombre as rubro, u.nombre, u.apellido, u.email, u.telefono
            FROM profesional p
            JOIN rubro r ON p.idRubro = r.idRubro
            JOIN usuario u ON p.idUsuario = u.idUsuario
            WHERE p.idProfesional = ?
        ");
        $stmt->execute([$id]);
        $prof = $stmt->fetch();
        if (!$prof) jsonResponse(['error' => 'Profesional no encontrado'], 404);
        jsonResponse($prof);
    }

    if ($idUsuario) {
        $stmt = $db->prepare("
            SELECT p.*, r.nombre as rubro, u.nombre, u.apellido, u.email, u.telefono
            FROM profesional p
            JOIN rubro r ON p.idRubro = r.idRubro
            JOIN usuario u ON p.idUsuario = u.idUsuario
            WHERE p.idUsuario = ?
        ");
        $stmt->execute([$idUsuario]);
        $prof = $stmt->fetch();
        if (!$prof) jsonResponse(['error' => 'Perfil profesional no encontrado'], 404);
        jsonResponse($prof);
    }

    $where = ["u.estado = 'activo'"];
    $params = [];

    if ($buscar) {
        $where[] = "(p.nombreNegocio LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ? OR r.nombre LIKE ?)";
        $term = "%$buscar%";
        $params = array_merge($params, [$term, $term, $term, $term]);
    }

    if ($idRubro) {
        $where[] = "p.idRubro = ?";
        $params[] = $idRubro;
    }

    $whereSQL = implode(' AND ', $where);

    $stmt = $db->prepare("
        SELECT p.*, r.nombre as rubro, u.nombre, u.apellido, u.email, u.telefono
        FROM profesional p
        JOIN rubro r ON p.idRubro = r.idRubro
        JOIN usuario u ON p.idUsuario = u.idUsuario
        WHERE $whereSQL
        ORDER BY p.nombreNegocio
    ");
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function handlePost() {
    $user = requireAuth();
    $data = getRequestBody();
    $db = getDB();

    $nombreNegocio = trim($data['nombreNegocio'] ?? '');
    $descripcion = trim($data['descripcion'] ?? '');
    $idRubro = intval($data['idRubro'] ?? 0);

    if (empty($nombreNegocio) || $idRubro <= 0) {
        jsonResponse(['error' => 'Nombre del negocio y rubro son requeridos'], 400);
    }

    // Verificar si ya tiene perfil
    $stmt = $db->prepare("SELECT idProfesional FROM profesional WHERE idUsuario = ?");
    $stmt->execute([$user['idUsuario']]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Ya tiene un perfil profesional'], 409);
    }

    $stmt = $db->prepare("INSERT INTO profesional (nombreNegocio, descripcion, idRubro, idUsuario) VALUES (?, ?, ?, ?)");
    $stmt->execute([$nombreNegocio, $descripcion, $idRubro, $user['idUsuario']]);

    // Actualizar rol a Profesional
    $stmt = $db->prepare("UPDATE usuario SET idRol = (SELECT idRol FROM rol WHERE nombreRol = 'Profesional') WHERE idUsuario = ?");
    $stmt->execute([$user['idUsuario']]);

    jsonResponse(['message' => 'Perfil profesional creado', 'id' => $db->lastInsertId()], 201);
}

function handlePut() {
    $user = requireRole(['Profesional', 'Administrador']);
    $data = getRequestBody();
    $db = getDB();

    $id = intval($data['idProfesional'] ?? $user['idProfesional'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'ID requerido'], 400);

    $fields = [];
    $values = [];

    if (isset($data['nombreNegocio'])) { $fields[] = 'nombreNegocio = ?'; $values[] = trim($data['nombreNegocio']); }
    if (isset($data['descripcion'])) { $fields[] = 'descripcion = ?'; $values[] = trim($data['descripcion']); }
    if (isset($data['idRubro'])) { $fields[] = 'idRubro = ?'; $values[] = intval($data['idRubro']); }

    if (empty($fields)) jsonResponse(['error' => 'No hay datos para actualizar'], 400);

    $values[] = $id;
    $stmt = $db->prepare("UPDATE profesional SET " . implode(', ', $fields) . " WHERE idProfesional = ?");
    $stmt->execute($values);

    jsonResponse(['message' => 'Perfil profesional actualizado']);
}
