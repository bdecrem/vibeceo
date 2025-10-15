import axios from "axios";
import { CheerioAPI, load } from "cheerio";

export interface StockNews {
  Date: string;
  Title: string;
  Source: string;
  Link: string;
}

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) \
            AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
};

export async function scrape_finviz(url: string): Promise<CheerioAPI> {
  const response = await axios.get(url, {
    headers: headers,
  });
  return load(response.data);
}

export function get_news_from_table($: CheerioAPI): StockNews[] {
  const news_table = $("#news").find("table");

  const items: StockNews[] = [];

  news_table.find("tr").each((_, row) => {
    try {
      const $row = $(row);

      const date = $row.find("td.news_date-cell").first().text().trim();

      const mainLink = $row.find("td.news_link-cell a.nn-tab-link").first();
      if (!mainLink.length) return;

      const title = mainLink.text().trim();
      const link = mainLink.attr("href");

      let source = $row
        .find("td.news_link-cell span.news_date-cell")
        .text()
        .trim();
      if (!source && link) {
        source = link.split("/")[2];
        if (source === "feedproxy.google.com") {
          source = link.split("/")[4];
        }
      }

      const info: StockNews = {
        Date: date,
        Title: title,
        Source: source,
        Link: link ?? "",
      };

      items.push(info);
    } catch {}
  });

  return items;
}
