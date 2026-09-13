use reqwest;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use reqwest::dns::{Name, Resolve, Resolving};
use std::net::SocketAddr;
use std::sync::Arc;
use trust_dns_resolver::config::{ResolverConfig, ResolverOpts};
use trust_dns_resolver::TokioAsyncResolver;

#[derive(Serialize, Deserialize, Debug)]
pub struct ScrapedVideo {
    pub title: String,
    pub link: String,
    pub image: String,
    pub rating: String,
    pub year: String,
}

struct Dns8888Resolver {
    resolver: Arc<TokioAsyncResolver>,
}

impl Dns8888Resolver {
    fn new() -> Self {
        let resolver = TokioAsyncResolver::tokio(ResolverConfig::google(), ResolverOpts::default());
        Self { resolver: Arc::new(resolver) }
    }
}

impl Resolve for Dns8888Resolver {
    fn resolve(&self, name: Name) -> Resolving {
        let resolver = self.resolver.clone();
        Box::pin(async move {
            let response = resolver.lookup_ip(name.as_str()).await?;
            let addrs: Box<dyn Iterator<Item = SocketAddr> + Send> = Box::new(
                response.into_iter().map(|ip| SocketAddr::new(ip, 0))
            );
            Ok(addrs)
        })
    }
}

fn get_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .dns_resolver(Arc::new(Dns8888Resolver::new()))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scrape_movieffm_home() -> Result<Vec<ScrapedVideo>, String> {
    let client = get_client()?;

    let res = client.get("https://www.movieffm.net/")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = res.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html);
    
    // movieffm typical structure: <article class="item"> ... <img src="..."> <a href="...">
    let selector = Selector::parse("article.item").unwrap();
    let title_selector = Selector::parse("h3 a").unwrap();
    let img_selector = Selector::parse("img").unwrap();
    let year_selector = Selector::parse(".year").unwrap();
    let rating_selector = Selector::parse(".rating").unwrap();

    let mut videos = Vec::new();

    for element in document.select(&selector) {
        let title = element.select(&title_selector).next().map(|n| n.inner_html()).unwrap_or_default();
        let link = element.select(&title_selector).next().and_then(|n| n.value().attr("href")).unwrap_or_default().to_string();
        let image = element.select(&img_selector).next().and_then(|n| n.value().attr("src")).unwrap_or_default().to_string();
        let year = element.select(&year_selector).next().map(|n| n.inner_html()).unwrap_or_default();
        let rating = element.select(&rating_selector).next().map(|n| n.inner_html()).unwrap_or_default();

        if !title.is_empty() && !link.is_empty() {
            videos.push(ScrapedVideo {
                title,
                link,
                image,
                rating,
                year,
            });
        }
    }

    Ok(videos)
}

#[tauri::command]
pub async fn search_movieffm_query(query: String) -> Result<Vec<ScrapedVideo>, String> {
    let client = get_client()?;

    let res = client.get(format!("https://www.movieffm.net/xssearch?q={}", query))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = res.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html);
    
    let selector = Selector::parse("article.item").unwrap();
    let title_selector = Selector::parse("h3 a").unwrap();
    let img_selector = Selector::parse("img").unwrap();
    let year_selector = Selector::parse(".year").unwrap();
    let rating_selector = Selector::parse(".rating").unwrap();

    let mut videos = Vec::new();

    for element in document.select(&selector) {
        let title = element.select(&title_selector).next().map(|n| n.inner_html()).unwrap_or_default();
        let link = element.select(&title_selector).next().and_then(|n| n.value().attr("href")).unwrap_or_default().to_string();
        let image = element.select(&img_selector).next().and_then(|n| n.value().attr("src")).unwrap_or_default().to_string();
        let year = element.select(&year_selector).next().map(|n| n.inner_html()).unwrap_or_default();
        let rating = element.select(&rating_selector).next().map(|n| n.inner_html()).unwrap_or_default();

        if !title.is_empty() && !link.is_empty() {
            videos.push(ScrapedVideo {
                title,
                link,
                image,
                rating,
                year,
            });
        }
    }

    Ok(videos)
}

#[tauri::command]
pub async fn get_movieffm_iframe(url: String) -> Result<String, String> {
    let client = get_client()?;

    let res = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = res.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html);
    
    // Player iframe is usually inside <div class="playex"> -> <iframe src="...">
    let iframe_selector = Selector::parse(".playex iframe").unwrap();
    
    if let Some(iframe) = document.select(&iframe_selector).next() {
        if let Some(src) = iframe.value().attr("src") {
            return Ok(src.to_string());
        }
    }
    
    // Alternative: sometimes it's in a <meta itemprop="embedUrl" content="...">
    let meta_selector = Selector::parse("meta[itemprop='embedUrl']").unwrap();
    if let Some(meta) = document.select(&meta_selector).next() {
        if let Some(content) = meta.value().attr("content") {
            return Ok(content.to_string());
        }
    }

    Err("找不到 iframe 播放器".to_string())
}

#[tauri::command]
pub async fn fetch_tmdb_html(url: String) -> Result<String, String> {
    let client = get_client()?;

    // Add ?language=zh-TW to URL if not already present
    let final_url = if url.contains("language=") {
        url.clone()
    } else if url.contains('?') {
        format!("{}&language=zh-TW", url)
    } else {
        format!("{}?language=zh-TW", url)
    };

    let res = client.get(&final_url)
        .header("Accept-Language", "zh-TW,zh;q=0.9,en;q=0.8")
        .header("Cookie", "tmdb.prefs=locale=zh-TW")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = res.text().await.map_err(|e| e.to_string())?;
    Ok(html)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IptvCategory {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IptvLanguage {
    pub code: String,
    pub name: String,
}

#[tauri::command]
pub async fn get_iptv_categories() -> Result<Vec<IptvCategory>, String> {
    let client = get_client()?;
    let res = client.get("https://iptv-org.github.io/api/categories.json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let categories: Vec<IptvCategory> = res.json().await.map_err(|e| e.to_string())?;
    Ok(categories)
}

#[tauri::command]
pub async fn get_iptv_languages() -> Result<Vec<IptvLanguage>, String> {
    let client = get_client()?;
    let res = client.get("https://iptv-org.github.io/api/languages.json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let languages: Vec<IptvLanguage> = res.json().await.map_err(|e| e.to_string())?;
    Ok(languages)
}

#[tauri::command]
pub async fn fetch_m3u(url: String) -> Result<String, String> {
    let client = get_client()?;
    let res = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}
