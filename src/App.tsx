import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ContinentList from "./pages/masters/ContinentListPage";
import ContinentForm from "./pages/masters/ContinentForm";
import CountryList from "./pages/masters/CountryListPage";
import CountryForm from "./pages/masters/CountryForm";
import StateList from "./pages/masters/StateListPage";
import StateForm from "./pages/masters/StateForm";
import DistrictList from "./pages/masters/DistrictListPage";
import DistrictForm from "./pages/masters/DistrictForm";
import CityList from "./pages/masters/CityListPage";
import CityForm from "./pages/masters/CityForm";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index path="/" element={<Home />} />
          <Route path="/masters/continents" element={<ContinentList />} />
          <Route path="/masters/continents/new" element={<ContinentForm />} />
          <Route path="/masters/continents/:id/edit" element={<ContinentForm />} />{/* New Add Form */}
          <Route path="/masters/countries" element={<CountryList />} />
          <Route path="/masters/countries/new" element={<CountryForm />} /> {/* New Add Form */}
          <Route path="/masters/countries/:id/edit" element={<CountryForm />} />
          <Route path="/masters/states" element={<StateList />} />
          <Route path="/masters/states/new" element={<StateForm />} /> {/* New Add Form */}
          <Route path="/masters/states/:id/edit" element={<StateForm />} />
          <Route path="/masters/districts" element={<DistrictList />} />
          <Route path="/masters/districts/new" element={<DistrictForm />} />
          <Route
            path="/masters/districts/:id/edit"
            element={<DistrictForm />}
          />
          <Route path="/masters/cities" element={<CityList/>}/>
          <Route path="/masters/cities/new" element={<CityForm />} />
          <Route
            path="/masters/cities/:id/edit"
            element={<CityForm />}
          />
          
          
        </Route>
      </Routes>
    </Router>
  );
}
