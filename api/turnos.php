<?php
/**
 * SmartAgenda Pro - API de Turnos
 * Reservar, cancelar, reprogramar, confirmar, finalizar
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
    $user = requireAuth();

    $idProfesional = $_GET['idProfesional'] ?? null;
    $idCliente = $_GET['idCliente'] ?? null;
    $fecha = $_GET['fecha'] ?? null;
    $estado = $_GET['estado'] ?? null;
    $fechaDesde = $_GET['fechaDesde'] ?? null;
    $fechaHasta = $_GET['fechaHasta'] ?? null;

    $where = [];
    $params = [];

    if ($idProfesional) { $where[] = 't.idProfesional = ?'; $params[] = $idProfesional; }
    if ($idCliente) { $where[] = 't.idCliente = ?'; $params[] = $idCliente; }
    if ($fecha) { $where[] = 't.fecha = ?'; $params[] = $fecha; }
    if ($estado) { $where[] = 't.estado = ?'; $params[] = $estado; }
    if ($fechaDesde) { $where[] = 't.fecha >= ?'; $params[] = $fechaDesde; }
    if ($fechaHasta) { $where[] = 't.fecha <= ?'; $params[] = $fechaHasta; }

    // Si es cliente, solo ver sus propios turnos
    if ($user['rol'] === 'Cliente') {
        $where[] = 't.idCliente = ?';
        $params[] = $user['idUsuario'];
    }
    // Si es profesional, solo ver los de su agenda
    if ($user['rol'] === 'Profesional' && !$idCliente) {
        $where[] = 't.idProfesional = ?';
        $params[] = $user['idProfesional'];
    }

    $whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT t.*, 
               s.nombre as servicio_nombre, s.duracionMin,
               p.nombreNegocio,
               uc.nombre as cliente_nombre, uc.apellido as cliente_apellido, uc.email as cliente_email,
               up.nombre as profesional_nombre, up.apellido as profesional_apellido
        FROM turno t
        JOIN servicio s ON t.idServicio = s.idServicio
        JOIN profesional p ON t.idProfesional = p.idProfesional
        JOIN usuario uc ON t.idCliente = uc.idUsuario
        JOIN usuario up ON p.idUsuario = up.idUsuario
        $whereSQL
        ORDER BY t.fecha DESC, t.horaInicio ASC
    ");
    $stmt->execute($params);

    jsonResponse($stmt->fetchAll());
}

function handlePost() {
    $user = requireAuth();
    $data = getRequestBody();
    $db = getDB();

    $fecha = $data['fecha'] ?? '';
    $horaInicio = $data['horaInicio'] ?? '';
    $idServicio = intval($data['idServicio'] ?? 0);
    $idProfesional = intval($data['idProfesional'] ?? 0);
    $idCliente = $user['idUsuario'];

    if (empty($fecha) || empty($horaInicio) || $idServicio <= 0 || $idProfesional <= 0) {
        jsonResponse(['error' => 'Datos incompletos'], 400);
    }

    // Obtener duración del servicio
    $stmt = $db->prepare("SELECT duracionMin FROM servicio WHERE idServicio = ?");
    $stmt->execute([$idServicio]);
    $servicio = $stmt->fetch();
    if (!$servicio) jsonResponse(['error' => 'Servicio no encontrado'], 404);

    // Calcular hora fin
    $inicio = new DateTime($fecha . ' ' . $horaInicio);
    $fin = clone $inicio;
    $fin->add(new DateInterval('PT' . $servicio['duracionMin'] . 'M'));
    $horaFin = $fin->format('H:i:s');

    // Verificar superposición de turnos
    $stmt = $db->prepare("
        SELECT idTurno FROM turno 
        WHERE idProfesional = ? AND fecha = ? AND estado IN ('pendiente', 'confirmado')
        AND ((horaInicio < ? AND horaFin > ?) OR (horaInicio < ? AND horaFin > ?) OR (horaInicio >= ? AND horaFin <= ?))
    ");
    $stmt->execute([$idProfesional, $fecha, $horaFin, $horaInicio, $horaFin, $horaInicio, $horaInicio, $horaFin]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'El horario seleccionado ya está ocupado'], 409);
    }

    // Crear turno
    $stmt = $db->prepare("
        INSERT INTO turno (fecha, horaInicio, horaFin, estado, idCliente, idServicio, idProfesional)
        VALUES (?, ?, ?, 'pendiente', ?, ?, ?)
    ");
    $stmt->execute([$fecha, $horaInicio, $horaFin, $idCliente, $idServicio, $idProfesional]);

    jsonResponse(['message' => 'Turno reservado exitosamente', 'id' => $db->lastInsertId()], 201);
}

function handlePut() {
    $user = requireAuth();
    $data = getRequestBody();
    $db = getDB();

    $idTurno = intval($data['idTurno'] ?? 0);
    $accion = $data['accion'] ?? '';

    if ($idTurno <= 0 || empty($accion)) {
        jsonResponse(['error' => 'ID de turno y acción requeridos'], 400);
    }

    // Obtener turno actual
    $stmt = $db->prepare("SELECT * FROM turno WHERE idTurno = ?");
    $stmt->execute([$idTurno]);
    $turno = $stmt->fetch();
    if (!$turno) jsonResponse(['error' => 'Turno no encontrado'], 404);

    switch ($accion) {
        case 'confirmar':
            if ($turno['estado'] !== 'pendiente') {
                jsonResponse(['error' => 'Solo se pueden confirmar turnos pendientes'], 400);
            }
            $stmt = $db->prepare("UPDATE turno SET estado = 'confirmado' WHERE idTurno = ?");
            $stmt->execute([$idTurno]);
            jsonResponse(['message' => 'Turno confirmado exitosamente']);
            break;

        case 'cancelar':
            if (!in_array($turno['estado'], ['pendiente', 'confirmado'])) {
                jsonResponse(['error' => 'No se puede cancelar este turno'], 400);
            }
            $motivo = trim($data['motivo'] ?? 'Sin motivo especificado');
            $db->beginTransaction();
            try {
                $stmt = $db->prepare("UPDATE turno SET estado = 'cancelado' WHERE idTurno = ?");
                $stmt->execute([$idTurno]);
                $stmt = $db->prepare("INSERT INTO cancelacion (motivo, idTurno) VALUES (?, ?)");
                $stmt->execute([$motivo, $idTurno]);
                $db->commit();
                jsonResponse(['message' => 'Turno cancelado correctamente']);
            } catch (Exception $e) {
                $db->rollBack();
                jsonResponse(['error' => 'Error al cancelar el turno'], 500);
            }
            break;

        case 'finalizar':
            if ($turno['estado'] !== 'confirmado') {
                jsonResponse(['error' => 'Solo se pueden finalizar turnos confirmados'], 400);
            }
            $stmt = $db->prepare("UPDATE turno SET estado = 'finalizado' WHERE idTurno = ?");
            $stmt->execute([$idTurno]);
            jsonResponse(['message' => 'Turno finalizado exitosamente']);
            break;

        case 'reprogramar':
            $nuevaFecha = $data['fecha'] ?? '';
            $nuevaHora = $data['horaInicio'] ?? '';
            if (empty($nuevaFecha) || empty($nuevaHora)) {
                jsonResponse(['error' => 'Nueva fecha y hora requeridas'], 400);
            }

            // Obtener duración del servicio
            $stmt = $db->prepare("SELECT duracionMin FROM servicio WHERE idServicio = ?");
            $stmt->execute([$turno['idServicio']]);
            $servicio = $stmt->fetch();

            $inicio = new DateTime($nuevaFecha . ' ' . $nuevaHora);
            $fin = clone $inicio;
            $fin->add(new DateInterval('PT' . $servicio['duracionMin'] . 'M'));
            $nuevaHoraFin = $fin->format('H:i:s');

            // Verificar disponibilidad (excluyendo el turno actual)
            $stmt = $db->prepare("
                SELECT idTurno FROM turno 
                WHERE idProfesional = ? AND fecha = ? AND idTurno != ?
                AND estado IN ('pendiente', 'confirmado')
                AND ((horaInicio < ? AND horaFin > ?) OR (horaInicio < ? AND horaFin > ?))
            ");
            $stmt->execute([$turno['idProfesional'], $nuevaFecha, $idTurno, $nuevaHoraFin, $nuevaHora, $nuevaHoraFin, $nuevaHora]);
            if ($stmt->fetch()) {
                jsonResponse(['error' => 'El nuevo horario no está disponible'], 409);
            }

            $stmt = $db->prepare("UPDATE turno SET fecha = ?, horaInicio = ?, horaFin = ? WHERE idTurno = ?");
            $stmt->execute([$nuevaFecha, $nuevaHora, $nuevaHoraFin, $idTurno]);
            jsonResponse(['message' => 'Turno reprogramado exitosamente']);
            break;

        default:
            jsonResponse(['error' => 'Acción no válida'], 400);
    }
}
