<?php
/**
 * SmartAgenda Pro - API de Reportes y Estadísticas
 */

require_once __DIR__ . '/cors.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') jsonResponse(['error' => 'Método no permitido'], 405);

$user = requireAuth();
$db = getDB();

$tipo = $_GET['tipo'] ?? 'general';
$fechaDesde = $_GET['fechaDesde'] ?? date('Y-m-01');
$fechaHasta = $_GET['fechaHasta'] ?? date('Y-m-t');
$idProfesional = $_GET['idProfesional'] ?? ($user['idProfesional'] ?? null);

switch ($tipo) {
    case 'general':
        $stats = [];

        // Total turnos por estado
        $where = "t.fecha BETWEEN ? AND ?";
        $params = [$fechaDesde, $fechaHasta];
        if ($idProfesional) { $where .= " AND t.idProfesional = ?"; $params[] = $idProfesional; }

        $stmt = $db->prepare("SELECT estado, COUNT(*) as total FROM turno t WHERE $where GROUP BY estado");
        $stmt->execute($params);
        $stats['turnosPorEstado'] = $stmt->fetchAll();

        // Turnos por día
        $stmt = $db->prepare("SELECT fecha, COUNT(*) as total FROM turno t WHERE $where GROUP BY fecha ORDER BY fecha");
        $stmt->execute($params);
        $stats['turnosPorDia'] = $stmt->fetchAll();

        // Servicios más solicitados
        $stmt = $db->prepare("
            SELECT s.nombre, COUNT(*) as total 
            FROM turno t JOIN servicio s ON t.idServicio = s.idServicio 
            WHERE $where GROUP BY s.idServicio, s.nombre ORDER BY total DESC LIMIT 5
        ");
        $stmt->execute($params);
        $stats['serviciosTop'] = $stmt->fetchAll();

        // Tasa de ocupación
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM turno t WHERE $where AND estado IN ('confirmado', 'finalizado')");
        $stmt->execute($params);
        $ocupados = $stmt->fetch()['total'];

        $stmt = $db->prepare("SELECT COUNT(*) as total FROM turno t WHERE $where");
        $stmt->execute($params);
        $totalTurnos = $stmt->fetch()['total'];

        $stats['tasaOcupacion'] = $totalTurnos > 0 ? round(($ocupados / $totalTurnos) * 100, 1) : 0;

        // Cancelaciones
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM turno t WHERE $where AND estado = 'cancelado'");
        $stmt->execute($params);
        $stats['totalCancelaciones'] = $stmt->fetch()['total'];

        $stats['totalTurnos'] = $totalTurnos;

        // Ingresos
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(s.precio), 0) as total 
            FROM turno t JOIN servicio s ON t.idServicio = s.idServicio 
            WHERE $where AND t.estado IN ('confirmado', 'finalizado')
        ");
        $stmt->execute($params);
        $stats['ingresos'] = floatval($stmt->fetch()['total']);

        jsonResponse($stats);
        break;

    case 'rubros':
        $stmt = $db->query("SELECT * FROM rubro ORDER BY nombre");
        jsonResponse($stmt->fetchAll());
        break;

    default:
        jsonResponse(['error' => 'Tipo de reporte no válido'], 400);
}
