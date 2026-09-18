<?php
/**
 * SmartAgenda Pro - Configuración de Base de Datos
 * Conexión PDO a MySQL
 */

function getDB() {
    $host = 'localhost';
    $dbname = 'smartagenda_pro';
    $user = 'smartagenda';
    $pass = '1234';

    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error de conexión a la base de datos']);
        exit;
    }
}
