import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const CA_COUNTIES: [string, string][] = [
	["001", "Alameda"],
	["003", "Alpine"],
	["005", "Amador"],
	["007", "Butte"],
	["009", "Calaveras"],
	["011", "Colusa"],
	["013", "Contra Costa"],
	["015", "Del Norte"],
	["017", "El Dorado"],
	["019", "Fresno"],
	["021", "Glenn"],
	["023", "Humboldt"],
	["025", "Imperial"],
	["027", "Inyo"],
	["029", "Kern"],
	["031", "Kings"],
	["033", "Lake"],
	["035", "Lassen"],
	["037", "Los Angeles"],
	["039", "Madera"],
	["041", "Marin"],
	["043", "Mariposa"],
	["045", "Mendocino"],
	["047", "Merced"],
	["049", "Modoc"],
	["051", "Mono"],
	["053", "Monterey"],
	["055", "Napa"],
	["057", "Nevada"],
	["059", "Orange"],
	["061", "Placer"],
	["063", "Plumas"],
	["065", "Riverside"],
	["067", "Sacramento"],
	["069", "San Benito"],
	["071", "San Bernardino"],
	["073", "San Diego"],
	["075", "San Francisco"],
	["077", "San Joaquin"],
	["079", "San Luis Obispo"],
	["081", "San Mateo"],
	["083", "Santa Barbara"],
	["085", "Santa Clara"],
	["087", "Santa Cruz"],
	["089", "Shasta"],
	["091", "Sierra"],
	["093", "Siskiyou"],
	["095", "Solano"],
	["097", "Sonoma"],
	["099", "Stanislaus"],
	["101", "Sutter"],
	["103", "Tehama"],
	["105", "Trinity"],
	["107", "Tulare"],
	["109", "Tuolumne"],
	["111", "Ventura"],
	["113", "Yolo"],
	["115", "Yuba"],
];

interface CountySelectorProps {
	value: string;
	onChange: (fips: string) => void;
	placeholder?: string;
}

export default function CountySelector({
	value,
	onChange,
	placeholder = "Select county",
}: CountySelectorProps) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-[220px]">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{CA_COUNTIES.map(([fips, name]) => (
					<SelectItem key={fips} value={fips}>
						{name} County
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export { CA_COUNTIES };
