<?php
if(isset($_GET["new_val"])){ 
    die($_GET["new_val"]);
}else{

echo <<<HTML
<div style="padding: 20px;">
    
    <form action="changeData.php" method="get">
        <h3>✏️ Name eingeben</h3>
        <p>Gebe dein Namen ein und klicke auf Speichern. Die Hauptseite aktualisiert sich automatisch.</p>
    
        <input type="text" name="new_val" style="width: 100%; padding: 8px;">
        <br><br>
        <button class="btn" data-inp-typ="close-btn">Abbrechen</button>
        <button type="submit" data-inp-typ="submit-btn" class="btn">Speichern</button>
    </form>
</div>

HTML;
}
?>