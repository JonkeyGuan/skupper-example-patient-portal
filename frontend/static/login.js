import * as gesso from "./gesso.js";

const html = `
<body class="excursion">
  <section>
    <div>
      <h1>Patient Portal</h1>

      <div class="hflex">
        <div style="width: 20em;">
          <h2>Log in as a patient:</h2>
          <ul id="patient-login-links"></ul>
        </div>
        <div style="width: 20em;">
          <h2>Log in as a doctor:</h2>
          <ul id="doctor-login-links"></ul>
        </div>
      </div>
    </div>
  </section>
</body>
`;

function renderPatientLoginLinks(data) {
    const collection = data.patients;
    const nav = gesso.createElement(null, "ul", {id: "patient-login-links", class: "login"});

    for (const item of Object.values(collection)) {
        const li = gesso.createElement(nav, "li");
        gesso.createLink(li, `/patient?id=${item.id}`, item.name);
    }

    gesso.replaceElement($("#patient-login-links"), nav);
}

function renderDoctorLoginLinks(data) {
    const collection = data.doctors;
    const nav = gesso.createElement(null, "ul", {id: "doctor-login-links", class: "login"});

    for (const item of Object.values(collection)) {
        const li = gesso.createElement(nav, "li");
        gesso.createLink(li, `/doctor?id=${item.id}`, item.name);
    }

    gesso.replaceElement($("#doctor-login-links"), nav);
}

export class MainPage extends gesso.Page {
    constructor() {
        super(html);
    }

    update() {
        fetch("/api/data", {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        })
            .then(response => response.json())
            .then(data => this.doUpdate(data));
    }

    doUpdate(data) {
        renderPatientLoginLinks(data);
        renderDoctorLoginLinks(data);
    }
}
