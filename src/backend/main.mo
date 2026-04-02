import Iter "mo:core/Iter";
import Outcall "http-outcalls/outcall";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Order "mo:core/Order";

actor {
  type NewsItem = {
    id : Text;
    title : Text;
    description : Text;
    url : Text;
    source : Text;
    publishedAt : Text;
    lat : Float;
    lng : Float;
    country : Text;
  };

  module NewsItem {
    public func compare(news1 : NewsItem, news2 : NewsItem) : Order.Order {
      Text.compare(news1.id, news2.id);
    };
  };

  type SourceLocation = {
    name : Text;
    lat : Float;
    lng : Float;
  };

  let sources = [
    { name = "BBC"; lat = 51.5; lng = -0.1 },
    { name = "Al Jazeera"; lat = 25.3; lng = 51.5 },
    { name = "Reuters"; lat = 40.7; lng = -74.0 },
    { name = "DW"; lat = 52.5; lng = 13.4 },
    { name = "France 24"; lat = 48.8; lng = 2.3 },
  ];

  let newsItems = Map.empty<Text, NewsItem>();
  var lastUpdated : Int = 0;

  func getSourceLocation(source : Text) : SourceLocation {
    for (s in sources.values()) {
      if (source.contains(#text(s.name))) {
        return s;
      };
    };
    sources[0];
  };

  func getNextElement(array : [Text], current : Text) : Text {
    var found = false;
    var i = 0;
    let arraySize = array.size();

    while (not found and i < arraySize - 1) {
      if (array[i] == current) {
        found := true;
        return array[i + 1];
      };
      i += 1;
    };

    array[0];
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  func fetchAndProcessFeed(url : Text, sourceName : Text) : async () {
    let rawFeed = await Outcall.httpGetRequest(
      url,
      [],
      transform,
    );
    let location = getSourceLocation(sourceName);

    newsItems.add(
      rawFeed,
      {
        id = rawFeed;
        title = rawFeed;
        description = rawFeed;
        url = rawFeed;
        source = sourceName;
        publishedAt = Time.now().toText();
        lat = location.lat;
        lng = location.lng;
        country = sourceName;
      },
    );
  };

  func truncateNewsItems() {
    let news = newsItems.values().toArray();
    if (news.size() > 100) {
      let items = news.sliceToArray(0, 100);
      newsItems.clear();
      for (item in items.values()) {
        newsItems.add(item.id, item);
      };
    };
  };

  public shared ({ caller }) func refreshNews() : async () {
    await fetchAndProcessFeed("https://feeds.bbci.co.uk/news/world/rss.xml", "BBC");
    await fetchAndProcessFeed("https://www.aljazeera.com/xml/rss/all.xml", "Al Jazeera");
    await fetchAndProcessFeed("https://feeds.reuters.com/reuters/worldNews", "Reuters");
    await fetchAndProcessFeed("https://rss.dw.com/xml/rss-en-world", "DW");
    await fetchAndProcessFeed("https://www.france24.com/en/rss", "France 24");

    truncateNewsItems();
    lastUpdated := Time.now();
  };

  public query ({ caller }) func getNews() : async [NewsItem] {
    newsItems.values().toArray().sort();
  };

  public query ({ caller }) func getLastUpdated() : async Int {
    lastUpdated;
  };

  // Helper to check country (for future geo logic)
  public query ({ caller }) func getNextCountry(current : Text) : async Text {
    let countries = ["UK", "Qatar", "USA", "Germany", "France"];
    getNextElement(countries, current);
  };
};
