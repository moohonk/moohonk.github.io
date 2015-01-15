<html>
	<head>
		<title>Charles Ruiter</title>
		<link rel = "stylesheet" href = "A7_styles.css">
	</head>
	<body>
        <h1>Retrieve daily weather for 20121</h1>
        <form name = "form1" method = "get" action = "weather.php">
			<!--Enter zip code:
            
                <input type = "text" name = "myStr"><span>     </span>-->
                <button type = "submit" accessKey = "s" name = "Submit"><u>S</u>ee weather</button>
        
		</form>
        <div>
<?php
    $ch = curl_init();
	function curl($url, $ch) {
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE); // Setting cURL's option to return the webpage data
        $data = curl_exec($ch);
        return $data;
    }
    function scrape_between($data, $start, $end){
        //returns the string in between $start and the first occurrence of $end
        $data1 = stristr($data , $start);
        $data1 = substr ($data1, strlen($start));
        $stop  = stripos($data1, $end);
        $data1 = substr ($data1, 0, $stop);
        return $data1;
    }
    function scrape_to_end($data, $start){
        $data1 = stristr($data, $start);
        return $data1;

    }
    class MyDB extends SQLite3
    {
        function __construct()
        {
            $this->open('myWeather.db', SQLITE3_OPEN_READWRITE);
        }
    }
	//$bool = array_key_exists('myStr', $_REQUEST);
	//if(array_key_exists('myStr', $_REQUEST)){
		//$str = $_REQUEST["myStr"];
        setlocale(LC_MONETARY, 'en_US');
        //$str = str_replace('"', "%22", "$str");
        //$str = str_replace(' ', "%20", "$str");
		$str_URL = "http://xml.weather.yahoo.com/forecastrss?p=20121";
        $scraped_page = curl("$str_URL", $ch);
        $temp = scrape_between("$scraped_page", "temp=", " date=");
        $scraped_page = scrape_to_end("$scraped_page", "yweather:forecast");
        $db = new MyDB();
        //$db->exec('DROP TABLE IF EXISTS weather');
        $db->exec("CREATE TABLE IF NOT EXISTS weather (date_string TEXT PRIMARY KEY, low INT, high INT, descr TEXT)");
        for($i = 0; $i < 5; $i++){
            $scraped_page = scrape_to_end ("$scraped_page", "yweather"      );
            $date  =        scrape_between("$scraped_page", "date=\"", "\"" );
            $low   = intval(scrape_between("$scraped_page", "low=\"" , "\""));
            $high  = intval(scrape_between("$scraped_page", "high=\"", "\""));
            $descr =        scrape_between("$scraped_page", "text=\"", "\"" );

            $db->exec("DELETE FROM weather WHERE date_string='$date_str'");
            $query = "INSERT INTO weather (date_string, low, high, descr) VALUES ('$date_str', '$low', '$high', '$descr')";
            $db->exec($query);
            $scraped_page = scrape_to_end("$scraped_page", "forecast");
        }
        $count = 0;
        $ret = $db->query("SELECT * FROM '$str'");
        $i = 0;
        echo "<table><th><td>Date</td><td>Low Temp</td><td>High Temp</td><td>Descriptor</td></th>";
        while($row = $ret->fetchArray(SQLITE3_ASSOC)){
            echo "<tr><td>".$row[$i]['date_string']."</td><td>";
            echo $row[$i]['low']."</td><td>";
            echo $row[$i]['high']."</td><td>";
            echo $row[$i]['descr']."</td></tr>";
            $count++;
        }
        //echo "database length = $count";
        curl_close($ch);
        

	//}
?>
</div>
</body>
</html>
