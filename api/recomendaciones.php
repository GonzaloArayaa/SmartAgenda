<?php
/**
 * SmartAgenda Pro - Motor Inteligente de Recomendaciones
 * Analiza la agenda y recomienda los mejores horarios
 */

require_once __DIR__ . '/cors.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') jsonResponse(['error' => 'Método no permitido'], 405);

$idProfesional = intval($_GET['idProfesional'] ?? 0);
$idServicio = intval($_GET['idServicio'] ?? 0);
$fecha = $_GET['fecha'] ?? '';

if ($idProfesional <= 0 || $idServicio <= 0 || empty($fecha)) {
    jsonResponse(['error' => 'idProfesional, idServicio y fecha son requeridos'], 400);
}

$db = getDB();

// 1. Obtener duración del servicio
$stmt = $db->prepare("SELECT duracionMin FROM servicio WHERE idServicio = ?");
$stmt->execute([$idServicio]);
$servicio = $stmt->fetch();
if (!$servicio) jsonResponse(['error' => 'Servicio no encontrado'], 404);
$duracion = $servicio['duracionMin'];

// 2. Obtener día de la semana en español
$dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
$diaSemana = $dias[date('w', strtotime($fecha))];

// 3. Obtener disponibilidad del profesional para ese día
$stmt = $db->prepare("SELECT * FROM disponibilidad WHERE idProfesional = ? AND diaSemana = ?");
$stmt->execute([$idProfesional, $diaSemana]);
$disponibilidad = $stmt->fetch();

if (!$disponibilidad) {
    jsonResponse(['error' => 'El profesional no atiende ese día', 'slots' => []]);
}

// 4. Obtener turnos existentes para esa fecha
$stmt = $db->prepare("
    SELECT horaInicio, horaFin FROM turno 
    WHERE idProfesional = ? AND fecha = ? AND estado IN ('pendiente', 'confirmado')
    ORDER BY horaInicio
");
$stmt->execute([$idProfesional, $fecha]);
$turnosExistentes = $stmt->fetchAll();

// 5. Generar todos los slots posibles según el intervalo
$intervalo = $disponibilidad['intervaloMin'];
$inicio = strtotime($disponibilidad['horaInicio']);
$fin = strtotime($disponibilidad['horaFin']);
$slots = [];

for ($t = $inicio; $t + ($duracion * 60) <= $fin; $t += $intervalo * 60) {
    $slotInicio = date('H:i', $t);
    $slotFin = date('H:i', $t + $duracion * 60);
    
    // Verificar si el slot se superpone con algún turno existente
    $disponible = true;
    foreach ($turnosExistentes as $turno) {
        $turnoInicio = substr($turno['horaInicio'], 0, 5);
        $turnoFin = substr($turno['horaFin'], 0, 5);
        
        if ($slotInicio < $turnoFin && $slotFin > $turnoInicio) {
            $disponible = false;
            break;
        }
    }
    
    if ($disponible) {
        $slots[] = [
            'horaInicio' => $slotInicio,
            'horaFin' => $slotFin,
            'duracionMin' => $duracion
        ];
    }
}

// 6. Calcular puntaje de eficiencia para cada slot
$slotsConPuntaje = [];
foreach ($slots as $slot) {
    $puntaje = 50; // Base
    $slotInicioTs = strtotime($slot['horaInicio']);
    $slotFinTs = strtotime($slot['horaFin']);
    
    // Bonificar si es adyacente a un turno existente (reduce huecos)
    foreach ($turnosExistentes as $turno) {
        $turnoInicioTs = strtotime(substr($turno['horaInicio'], 0, 5));
        $turnoFinTs = strtotime(substr($turno['horaFin'], 0, 5));
        
        // Justo después de un turno existente
        if ($slotInicioTs === $turnoFinTs) {
            $puntaje += 30;
        }
        // Justo antes de un turno existente
        if ($slotFinTs === $turnoInicioTs) {
            $puntaje += 30;
        }
        // Cerca de un turno (dentro de 30 min)
        $distanciaAntes = abs($slotFinTs - $turnoInicioTs) / 60;
        $distanciaDespues = abs($slotInicioTs - $turnoFinTs) / 60;
        
        if ($distanciaAntes > 0 && $distanciaAntes <= 30 && $slotFinTs <= $turnoInicioTs) {
            $puntaje += 15;
        }
        if ($distanciaDespues > 0 && $distanciaDespues <= 30 && $slotInicioTs >= $turnoFinTs) {
            $puntaje += 15;
        }
    }
    
    // Penalizar si crea un hueco pequeño (< duración del servicio)
    foreach ($turnosExistentes as $turno) {
        $turnoInicioTs = strtotime(substr($turno['horaInicio'], 0, 5));
        $turnoFinTs = strtotime(substr($turno['horaFin'], 0, 5));
        
        // Hueco entre fin del slot y próximo turno
        if ($slotFinTs < $turnoInicioTs) {
            $hueco = ($turnoInicioTs - $slotFinTs) / 60;
            if ($hueco > 0 && $hueco < $duracion) {
                $puntaje -= 20;
            }
        }
        // Hueco entre turno anterior y inicio del slot
        if ($turnoFinTs < $slotInicioTs) {
            $hueco = ($slotInicioTs - $turnoFinTs) / 60;
            if ($hueco > 0 && $hueco < $duracion) {
                $puntaje -= 20;
            }
        }
    }
    
    // Bonificar horarios de mañana (preferencia general)
    $hora = intval(date('H', $slotInicioTs));
    if ($hora >= 8 && $hora <= 11) $puntaje += 10;
    
    // Limitar puntaje entre 0 y 100
    $puntaje = max(0, min(100, $puntaje));
    
    $slot['puntaje'] = $puntaje;
    $slot['recomendado'] = false;
    $slotsConPuntaje[] = $slot;
}

// 7. Ordenar por puntaje descendente
usort($slotsConPuntaje, fn($a, $b) => $b['puntaje'] - $a['puntaje']);

// 8. Marcar top 3 como recomendados
for ($i = 0; $i < min(3, count($slotsConPuntaje)); $i++) {
    $slotsConPuntaje[$i]['recomendado'] = true;
}

// Reordenar por hora para mostrar en orden cronológico
usort($slotsConPuntaje, fn($a, $b) => strcmp($a['horaInicio'], $b['horaInicio']));

jsonResponse([
    'fecha' => $fecha,
    'diaSemana' => $diaSemana,
    'profesional' => $idProfesional,
    'servicio' => $idServicio,
    'duracionServicio' => $duracion,
    'totalSlots' => count($slotsConPuntaje),
    'slots' => $slotsConPuntaje
]);
