const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=19226ec3-bbcd-428d-9f1a-ed2a275a8966";

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

async function fetchObjects() {
  const url = `${BASE_URL}/object?${KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllCenturies() {
  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;
  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    localStorage.setItem("centuries", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllClassifications() {
  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;

  if (localStorage.getItem("classifications")) {
    return JSON.parse(localStorage.getItem("classifications"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    localStorage.setItem("classifications", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  }
}

async function prefetchCategoryLists() {
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);

    $(".classification-count").text(`(${classifications.length})`);

    classifications.forEach((classification) => {
      $("#select-classification").append(
        $(
          `<option value="${classification.name}">${classification.name}</option>`
        )
      );
    });

    $(".century-count").text(`(${centuries.length})`);
    centuries.forEach((century) => {
      $("#select-century").append(
        $(`<option value="${century.name}">${century.name}</option>`)
      );
    });
  } catch (error) {
    console.error(error);
  }
}

function buildSearchString() {
  const classify = $("#select-classification").val();
  const centuryElement = $("#select-century").val();
  const keyWords = $("#keywords").val();
  const url = `${BASE_URL}/object?${KEY}&classification=${classify}&century=${centuryElement}&keyword=${keyWords}`;
  return url;
}

$("#search").on("submit", async function (event) {
  event.preventDefault();
  onFetchStart();
  try {
    const encodeUrl = encodeURI(buildSearchString());
    const response = await fetch(encodeUrl);
    const { info, records } = await response.json();
    console.log(info, records);
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

function renderPreview(record) {
  const { primaryimageurl, title } = record;
  return $(`<div class="object-preview">
    <a href="#">
      ${primaryimageurl ? `<img src="${primaryimageurl}" />` : ""}
      ${title ? `<h3>${title}</h3>` : ""}
    </a>
  </div>`).data("record", record);
}

function updatePreview(records, info) {
  const root = $("#preview");

  if (info.next) {
    const nextButton = $(".next").data("url", info.next);
    nextButton.attr("disabled", false);
  } else {
    const nextButton = $(".next").data("url", null);
    nextButton.attr("disabled", true);
  }

  if (info.prev) {
    const prevButton = $(".previous").data("url", info.prev);
    prevButton.attr("disabled", false);
  } else {
    const prevButton = $(".previous").data("url", null);
    prevButton.attr("disabled", true);
  }

  const results = root.find(".results");
  results.empty();
  console.log(records);
  records.forEach((record) => {
    results.append(renderPreview(record));
  });
}

$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();
  try {
    let url = $(this).data("url");
    const response = await fetch(url);
    const { info, records } = await response.json();
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault();
  const objectPreview = $(this).closest(".object-preview");
  const objectPreviewData = objectPreview.data("record");
  console.log(objectPreviewData);
  $("#feature").html(renderFeature(objectPreviewData));
});

function renderFeature(record) {
  const {
    title,
    dated,
    images,
    primaryimageurl,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
  } = record;

  return $(`<div class="object-feature">
    <header>
      <h3>${title}<h3>
      <h4>${dated}</h4>
    </header>
    <section class="facts">
      ${factHTML("Description", description)}
      ${factHTML("Culture", culture, "culture")}
      ${factHTML("Style", style)}
      ${factHTML("Technique", technique, "technique")}
      ${factHTML("Medium", medium ? medium.toLowerCase() : null, "medium")}
      ${factHTML("Dimensions", dimensions)}
      ${
        people
          ? people
              .map((person) => factHTML("Person", person.displayname, "person"))
              .join("")
          : ""
      }
      ${factHTML("Department", department)}
      ${factHTML("Division", division)}
      ${factHTML(
        "Contact",
        `<a target="_blank" href="mailto:${contact}">${contact}</a>`
      )}
      ${factHTML("Credit", creditline)}
    </section>
    <section class="photos">
      ${photosHTML(images, primaryimageurl)}
    </section>
  </div>`);
}

function searchURL(searchType, searchString) {
  return `${BASE_URL}/object?${KEY}&${searchType}=${searchString}`;
}

function factHTML(title, content, searchTerm = null) {
  if (!content) {
    return "";
  }

  return `
    <span class="title">${title}</span>
    <span class="content">${
      searchTerm && content
        ? `<a href="${BASE_URL}/${"object"}?${KEY}&${searchTerm}=${encodeURI(
            content.split("-").join("|")
          )}">${content}</a>`
        : content
    }
    </span>
  `;
}

function photosHTML(images, primaryimageurl) {
  if (images && images.length > 0) {
    return images.map(function (image) {
      return `<img src="${image.baseimageurl}" />`;
    });
  } else if (primaryimageurl) {
    return `<img src = "${primaryimageurl}"/>`;
  } else {
    return "";
  }
}

$("#feature").on("click", "a", async function (event) {
  const href = $(this).attr("href");

  if (href.startsWith("mailto:")) {
    return;
  }

  event.preventDefault();

  onFetchStart();
  try {
    let result = await fetch(href);
    let { records, info } = await result.json();
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

function bootstrap() {
  fetchObjects();
  prefetchCategoryLists();
}

bootstrap();
