function getMockBusinesses() {
  return [
    {
      name: "Ohio Plumbing & Boiler",
      website: "https://www.ohioplumbing.com",
      phone: "330-555-1111",
      reviews: 40,
      category: "plumbing",
    },
    {
      name: "Apollo Heating & Cooling",
      website: "https://www.apolloheatingandcooling.com",
      phone: "330-555-2222",
      reviews: 80,
      category: "hvac",
    },
    {
      name: "Aspen Dental",
      website: "https://www.aspendental.com",
      phone: "330-555-3333",
      reviews: 60,
      category: "dental",
    },
    {
      name: "Mr. Rooter Plumbing",
      website: "https://www.mrrooter.com",
      phone: "330-555-4444",
      reviews: 100,
      category: "plumbing",
    },
    {
      name: "One Hour Heating & Air",
      website: "https://www.onehourheatandair.com",
      phone: "330-555-5555",
      reviews: 120,
      category: "hvac",
    }
  ];
}

module.exports = { getMockBusinesses };