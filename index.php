<?php
require_once './data.php';
function readUrlsFromFile($filename) {
    try {
        $data = file_get_contents($filename);
        return array_filter(explode("\n", $data));
    } catch (Exception $error) {
        echo 'Error reading URLs from file:', $error->getMessage();
        return [];
    }
}

function fetchHtml($url) {
    try {
        $response = file_get_contents($url);
        return $response;
    } catch (Exception $error) {
        echo 'Error fetching the HTML from ' . $url . ':', $error->getMessage();
        return null;
    }
}

function parseAndSave($url, $data) {
    $html = fetchHtml($url);

    if (!$html) {
        echo 'Could not fetch HTML content from ' . $url . '.';
        return [];
    }
    $dom = new DOMDocument();
    @$dom->loadHTML($html);
    $xpath = new DOMXPath($dom);
    $products = [];
    $productName = $dom->getElementsByTagName('h1')[0]->nodeValue;

    $options = $xpath->query('//ul[@class="product-options"]/li');
    foreach ($options as $option) {
        $input = $xpath->query('input[@class="product-options"]', $option)[0];
        $label = $xpath->query('label', $option)[0];
        $articul = $input->getAttribute('value');
        $price = $input->getAttribute('data-price');
        $availability = $label->getAttribute('class') === 'product-options-disabled' ? 'Нет в наличии' : 'В наличии';
        $description = trim($label->nodeValue);
        if (!array_key_exists($articul, $data)) {
            continue;
        }
        $products[] = [
            'Name' => $productName,
            'articulTTsport' => $articul,
            'offer id' => $data[$articul],
            'price' => explode(' ', $price)[0],
            'Наличие' => $availability,
            'Описание' => $description,
            'Склад' => 'TTСпорт',
            'Cсылка' => $url,
        ];
    }

    return $products;
}

function main() {
    $urls = readUrlsFromFile('urls.txt');
    $allProducts = [];
    $count = 0;
    foreach ($urls as $url) {
        $products = parseAndSave($url, $data);
        $count++;
        echo 'Product ' . $count . ' parse done!' . PHP_EOL;
        $allProducts = array_merge($allProducts, $products);
    }

    $csvFilename = 'products_combined.csv';
    $csvContent = "Name;articulTTsport;offer id;price;Наличие;Модификация;Ссылка\n";
    foreach ($allProducts as $product) {
        $csvContent .= implode(';', $product) . "\n";
    }

    file_put_contents($csvFilename, $csvContent);
    echo 'Data successfully parsed and saved to the file ' . $csvFilename . PHP_EOL;
}


main();