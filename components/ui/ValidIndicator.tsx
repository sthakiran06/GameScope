import { Ionicons } from "@expo/vector-icons"

export function ValidIndicator ( props:any ) {
    if( props.valid ) {
        return(
            <Ionicons name="checkmark" size={18} color="lightgreen" />
        )
    }
    else {
        return null
    }
}