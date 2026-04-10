<?php
if(isset($_GET["new_val"])){ 
    die($_GET["new_val"]);
}else{

echo <<<HTML
<div style="padding: 20px;">
    <h3>✏️ Wert ändern</h3>
    <p>Ändere den Text und klicke Speichern. Die Hauptseite aktualisiert sich automatisch.</p>
    
    <form action="changeData.php" method="get">
        <input type="text" name="new_val" value="InP ist verdammt schnell!" style="width: 100%; padding: 8px;">
        <br><br>
                <button class="btn" data-inp-typ="close-btn">Abbrechen</button>
        <button type="submit" data-inp-typ="submit-btn" class="btn">Speichern</button>
    </form>
</div>

HTML;
}
?>