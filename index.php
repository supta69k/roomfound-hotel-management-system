<?php
// The site lives under /src; send visitors who open the domain root there.
header('Location: src/index.html', true, 302);
exit;
