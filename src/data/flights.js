export const FLIGHTS = [
  { id: "out-main", type: "Outbound", date: "18 May", flight: "TOM566", aircraft: "Boeing 787 Dreamliner", from: { code: "BHX", city: "Birmingham" }, to: { code: "PUJ", city: "Punta Cana" }, depart: "11:00", arrive: "14:50", duration: "9h 50m", who: ["Kai", "Khari", "Candice", "Kyanna"] },
  { id: "out-cm", type: "Outbound", date: "19 May", flight: "AV121 + AV128", aircraft: "787-8 / A320", from: { code: "LHR", city: "London" }, to: { code: "PUJ", city: "Punta Cana" }, depart: "22:05", arrive: "11:25+1", duration: "18h 20m", stops: 1, stopCity: "Bogota", who: ["Camara", "Miles"] },
  { id: "return-girls", type: "Return", date: "25 May", flight: "TOM567", aircraft: "Boeing 787 Dreamliner", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "BHX", city: "Birmingham" }, depart: "16:50", arrive: "06:00+1", duration: "8h 10m", who: ["Candice", "Kyanna"] },
  { id: "return-camara", type: "Return", date: "26 May", flight: "AV137 + AV120", aircraft: "A320 / 787-8", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "LHR", city: "London" }, depart: "18:35", arrive: "15:35+1", duration: "16h", stops: 1, stopCity: "Bogota", who: ["Camara"] },
  { id: "return-miles", type: "Return", date: "25 May", flight: "AV137 + AV120", aircraft: "A320 / 787-8", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "LHR", city: "London" }, depart: "18:35", arrive: "15:35+1", duration: "16h", stops: 1, stopCity: "Bogota", who: ["Miles"] },
  { id: "return-boys", type: "Return", date: "29 May", flight: "TOM569", aircraft: "Boeing 787 Dreamliner", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "BHX", city: "Birmingham" }, depart: "17:10", arrive: "06:15+1", duration: "8h 05m", who: ["Kai", "Khari"] },
  { id: "out-ebony", type: "Outbound", date: "17 May", flight: "TOM054", aircraft: "Boeing 787 Dreamliner", from: { code: "LGW", city: "London" }, to: { code: "PUJ", city: "Punta Cana" }, depart: "10:30", arrive: "14:30", duration: "9h 00m", who: ["Ebony"] },
  { id: "return-ebony", type: "Return", date: "24 May", flight: "TOM055", aircraft: "Boeing 787 Dreamliner", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "LGW", city: "London" }, depart: "17:40", arrive: "07:00+1", duration: "8h 20m", who: ["Ebony"] },
];

export const flightsForPlayer = (playerName) =>
  FLIGHTS.filter((f) => f.who.includes(playerName));
